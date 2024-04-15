// 🐨 add 'use server' here to turn this module into an RSC reference
'use server'

import * as db from '../db/ship-api.js'

export async function updateShipName(previousState, formData) {
	console.log({ previousState, formData })
	try {
		await db.updateShipName({
			shipId: formData.get('shipId'),
			shipName: formData.get('shipName'),
		})
		// 🐨 return a status of 'success' and a message of 'Success!'
		return { status: 'success', message: 'Success!' }
	} catch (error) {
		// 🐨 return a status of 'error' and a message of error?.message || String(error)
		return { status: 'error', message: error?.message || String(error) }
	}
}
