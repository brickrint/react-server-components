import {
	Suspense,
	createElement as h,
	startTransition,
	use,
	useDeferredValue,
	useEffect,
	useRef,
	useState,
	useTransition,
} from 'react'
import { createRoot } from 'react-dom/client'
import * as RSC from 'react-server-dom-esm/client'
import { contentCache, useContentCache, generateKey } from './content-cache.js'
import { ErrorBoundary } from './error-boundary.js'
import { shipFallbackSrc } from './img-utils.js'
import { RouterContext, getGlobalLocation } from './router.js'

function fetchContent(location) {
	return fetch(`/rsc${location}`)
}

function updateContentKey() {
	console.error('updateContentKey called before it was set!')
}

function createFromFetch(fetchPromise) {
	return RSC.createFromFetch(fetchPromise, {
		moduleBaseURL: `${window.location.origin}/js/src`,
		callServer,
	})
}

async function callServer(id, args) {
	// using the global location to avoid a stale closure over the location
	const fetchPromise = fetch(`/action${getGlobalLocation()}`, {
		method: 'POST',
		headers: { 'rsc-action': id },
		body: await RSC.encodeReply(args),
	})
	const contentKey = window.history.state?.key ?? generateKey()
	onStreamFinished(fetchPromise, () => {
		updateContentKey(contentKey)
	})
	const actionResponsePromise = createFromFetch(fetchPromise)
	contentCache.set(contentKey, actionResponsePromise)
	const { returnValue } = await actionResponsePromise
	return returnValue
}

const initialLocation = getGlobalLocation()
const initialContentPromise = createFromFetch(fetchContent(initialLocation))

let initialContentKey = window.history.state?.key
if (!initialContentKey) {
	initialContentKey = generateKey()
	window.history.replaceState({ key: initialContentKey }, '')
}
contentCache.set(initialContentKey, initialContentPromise)

function onStreamFinished(fetchPromise, onFinished) {
	// create a promise chain that resolves when the stream is completely consumed
	return (
		fetchPromise
			// clone the response so createFromFetch can use it (otherwise we lock the reader)
			// and wait for the text to be consumed so we know the stream is finished
			.then(response => response.clone().text())
			.then(onFinished)
	)
}

function Root() {
	const latestNav = useRef(null)
	const contentCache = useContentCache()
	const [nextLocation, setNextLocation] = useState(getGlobalLocation)
	const [contentKey, setContentKey] = useState(initialContentKey)
	const [isPending, startTransition] = useTransition()

	// set the updateContentKey function in a useEffect to avoid issues with
	// concurrent rendering (useDeferredValue will create throw-away renders).
	useEffect(() => {
		updateContentKey = newContentKey => {
			startTransition(() => setContentKey(newContentKey))
		}
	}, [])

	const location = useDeferredValue(nextLocation)
	const contentPromise = contentCache.get(contentKey)

	useEffect(() => {
		function handlePopState() {
			const nextLocation = getGlobalLocation()
			setNextLocation(nextLocation)
			const historyKey = window.history.state?.key ?? generateKey()

			// 🐨 handle race conditions for this revalidation similar to what we do
			// in navigate below with the latestNav ref.
			const thisNav = Symbol(`Popstate for ${nextLocation}`)
			latestNav.current = thisNav

			// 🐨 declare "let nextContentPromise" here
			// 🐨 move the fetchPromise up from the if statement below because now we're going to revalidate all the time
			let nextContentPromise
			const fetchPromise = fetchContent(nextLocation)
			onStreamFinished(fetchPromise, () => {
				contentCache.set(historyKey, nextContentPromise)
			})
			nextContentPromise = createFromFetch(fetchPromise)
			// 🐨 when the fetchPromise stream is finished (💰 onStreamFinished):
			//   set the historyKey in the contentCache to nextContentPromise
			// 🐨 assign nextContentPromise to createFromFetch(fetchPromise)

			if (!contentCache.has(historyKey)) {
				// 🐨 move these two things up because we're going to do it all the time:

				// if we don't have this key in the cache already, set it now
				contentCache.set(historyKey, nextContentPromise)
			}

			updateContentKey(historyKey)
		}
		window.addEventListener('popstate', handlePopState)
		return () => window.removeEventListener('popstate', handlePopState)
	}, [])

	function navigate(nextLocation, { replace = false } = {}) {
		setNextLocation(nextLocation)
		const thisNav = Symbol(`Nav for ${nextLocation}`)
		latestNav.current = thisNav

		const newContentKey = generateKey()
		const nextContentPromise = createFromFetch(
			fetchContent(nextLocation).then(response => {
				if (thisNav !== latestNav.current) return
				if (replace) {
					window.history.replaceState({ key: newContentKey }, '', nextLocation)
				} else {
					window.history.pushState({ key: newContentKey }, '', nextLocation)
				}
				return response
			}),
		)

		contentCache.set(newContentKey, nextContentPromise)
		updateContentKey(newContentKey)
	}

	return h(
		RouterContext.Provider,
		{
			value: {
				navigate,
				location,
				nextLocation,
				isPending,
			},
		},
		use(contentPromise).root,
	)
}

startTransition(() => {
	createRoot(document.getElementById('root')).render(
		h(
			'div',
			{ className: 'app-wrapper' },
			h(
				ErrorBoundary,
				{
					fallback: h(
						'div',
						{ className: 'app-error' },
						h('p', null, 'Something went wrong!'),
					),
				},
				h(
					Suspense,
					{
						fallback: h('img', {
							style: { maxWidth: 400 },
							src: shipFallbackSrc,
						}),
					},
					h(Root),
				),
			),
		),
	)
})
