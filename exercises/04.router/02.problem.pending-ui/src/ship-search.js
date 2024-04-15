'use client'

import { Fragment, Suspense, createElement as h } from 'react'
import { ErrorBoundary } from './error-boundary.js'
// 💰 bring in parseLocationState here
import { mergeLocationState, useRouter, parseLocationState } from './router.js'
// 💯 if you want to do the extra credit, you'll want this:
import { useSpinDelay } from './spin-delay.js'

export function ShipSearch({ search, results, fallback }) {
	// 🐨 get the nextLocation here
	const { navigate, location, nextLocation, isPending } = useRouter()
	// 🐨 we're pending if the nextLocation's search is different from the current
	// location's search
	// 💰 you'll want to use parseLocationState for this
	const { search: currentSearch } = parseLocationState(location)
	const { search: nextSearch } = parseLocationState(nextLocation)
	// 💯 for extra credit, avoid a flash of loading state with useSpinDelay
	const isShipSearchPending = useSpinDelay(currentSearch !== nextSearch || isPending)

	return h(
		Fragment,
		null,
		h(
			'form',
			{ onSubmit: e => e.preventDefault() },
			h('input', {
				placeholder: 'Filter ships...',
				type: 'search',
				defaultValue: search,
				name: 'search',
				autoFocus: true,
				onChange: event => {
					const newLocation = mergeLocationState(location, {
						search: event.currentTarget.value,
					})
					navigate(newLocation, { replace: true })
				},
			}),
		),
		h(
			ErrorBoundary,
			{ fallback: ShipResultsErrorFallback },
			h(
				'ul',
				{ style: { opacity: isShipSearchPending ? 0.6 : 1 } },
				h(Suspense, { fallback }, results),
			),
		),
	)
}

export function SelectShipLink({ shipId, highlight, children }) {
	const { location, navigate } = useRouter()
	return h('a', {
		children,
		href: `/${shipId}`,
		style: { fontWeight: highlight ? 'bold' : 'normal' },
		onClick: event => {
			if (event.ctrlKey || event.metaKey || event.shiftKey) return
			event.preventDefault()
			const newLocation = mergeLocationState(location, { shipId })
			navigate(newLocation)
		},
	})
}

export function ShipResultsErrorFallback() {
	return h(
		'div',
		{ style: { padding: 6, color: '#CD0DD5' } },
		'There was an error retrieving results',
	)
}
