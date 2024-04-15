import { Suspense, createElement as h, startTransition, use } from 'react'
import { createRoot } from 'react-dom/client'
import { createFromFetch } from 'react-server-dom-esm/client'
import { ErrorBoundary } from './error-boundary.js'
import { shipFallbackSrc } from './img-utils.js'

const getGlobalLocation = () =>
	window.location.pathname + window.location.search

const initialLocation = getGlobalLocation()
const initialContentFetchPromise = fetch(`/rsc${initialLocation}`)
const initialContentPromise = createFromFetch(initialContentFetchPromise, {
	// 🐨 add a moduleBaseURL option here set to `${window.location.origin}/js/src`
	moduleBaseURL: `${window.location.origin}/js/src`,
})

function Root() {
	const content = use(initialContentPromise)
	return content
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
