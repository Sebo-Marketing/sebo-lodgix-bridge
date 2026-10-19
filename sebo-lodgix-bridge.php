<?php
/**
 * Plugin Name:       Sebo Lodgix Bridge
 * Description:       Keeps the visitor and their ad source when they book through an embedded Lodgix calendar, so GA4 and Google Ads credit the reservation on lodgix.com to the right source. No settings.
 * Version:           1.0.0
 * Plugin URI:        https://github.com/Sebo-Marketing/sebo-lodgix-bridge
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            Sebo Marketing
 * Author URI:        https://sebomarketing.com
 * License:           GPL-2.0-or-later
 *
 * ---------------------------------------------------------------------------
 * Lodgix's embedded calendar asks the page for a Universal Analytics linker
 * (ga.getAll()[0].get('linkerParam')) when a visitor picks dates, and adds the
 * answer to its Book link. With GA4 there is no `ga`, so the answer is empty
 * and every checkout on lodgix.com starts as a new visitor with no source.
 * assets/bridge.js answers instead with GA4's own cross-domain value (_gl)
 * and the visitor's stored ad source (gclid, utm_*), which the Lodgix-side
 * Google Tag Manager container turns back into GA4's hand-off and campaign
 * fields. It is the same bridge the Sebo theme carries; this plugin is for
 * sites that don't run that theme.
 *
 * It needs, outside this plugin: a GA4 Google tag on the site whose web stream
 * lists lodgix.com under cross-domain measurement, and the Utah Family Lodges
 * container in Lodgix's tracking box (it routes each property to its GA4).
 * ---------------------------------------------------------------------------
 *
 * @package SeboLodgixBridge
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'SEBO_LXB_VERSION', '1.0.0' );

/**
 * In <head>, early, so `ga` is answered before Lodgix's calendar asks. About
 * 3 KB, no dependencies, nothing visitor-specific in the page (safe with any
 * page cache).
 */
add_action(
	'wp_enqueue_scripts',
	function () {
		wp_enqueue_script( 'sebo-lodgix-bridge', plugins_url( 'assets/bridge.js', __FILE__ ), array(), SEBO_LXB_VERSION, false );
	},
	1
);

/**
 * Updates come from this repository's GitHub releases, like any plugin. The
 * repository is public, so no token is needed.
 */
require __DIR__ . '/plugin-update-checker/plugin-update-checker.php';
YahnisElsts\PluginUpdateChecker\v5\PucFactory::buildUpdateChecker(
	'https://github.com/Sebo-Marketing/sebo-lodgix-bridge/',
	__FILE__,
	'sebo-lodgix-bridge'
)->setBranch( 'main' );
