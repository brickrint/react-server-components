import { Suspense, createElement as h, startTransition, use } from 'react'
import { createRoot } from 'react-dom/client'
// 💰 you're going to want this:
import { createFromFetch } from 'react-server-dom-esm/client'
import { shipFallbackSrc } from './img-utils.js'

const getGlobalLocation = () =>
	window.location.pathname + window.location.search

const initialLocation = getGlobalLocation()
// 🐨 rename this to something more accurate like initialContentFetchPromise
const initialContentFetchPromise = fetch(`/rsc${initialLocation}`)

// 🐨 create a variable called initialContentPromise set to createFromFetch(initialContentFetchPromise)
const initialContentPromise = createFromFetch(initialContentFetchPromise)

function Root() {
	const content = use(initialContentPromise)
	// 🐨 create a variable called content set to use(initialContentPromise)
	// 💯 as a bonus, go ahead and console.log the content variable and check it out in the dev tools!
	console.log(content)
	// 🐨 return the content
	return content
}

startTransition(() => {
	createRoot(document.getElementById('root')).render(
		h(
			'div',
			{ className: 'app-wrapper' },
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
	)
})
