=== Page Cache on Cloudflare ===
Contributors: DzmitryAd, alkononovich
Tags: cache,speed,cloudflare
Author URI: https://palessit.com
Requires at least: 3.3.1
Tested up to: 5.2.3
Requires PHP: 5.6
Version: 1.2
Stable tag: trunk
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

The fastest cache pages on Cloudflare with purge by button and automatic. You can specify URLs and cookies to exclude caching.

== Description ==
The plugin is an improved version of the "Cloudflare Page Cache" plugin. The plugin does not cache pages for logged-in users by default. You can disable caching for some URLs and for users with certain cookies (use the constants BYPASS_COOKIES_EXTRA and NON_CACHEABLE_URLS_EXTRA for the settings).
For the plugin to work, you need to have a Cloudflare account with special settings. To purge the cache by the button, you need to set Cloudflare API settings in the plugin (CF_EMAIL - From https://dash.cloudflare.com/profile, CF_API_KEY - Global API Key from https://dash.cloudflare.com/profile, CF_ACCOUNT_ID, CF_NAMESPACE_ID).
In the Сloudflare account, you need to create a worker, for details go https://github.com/palessit/cloudflare-cache-page. The plugin can preload cache on Cloudflare.

== Installation ==
You can install the plugin from the WordPress Dashboard:
- Visit “Plugins” → Add New;
- Search for "Page Cache on Cloudflare"
- Download and activate the plugin
- Set Cloudflare API settings CF_EMAIL, CF_API_KEY, CF_ACCOUNT_ID, CF_NAMESPACE_ID. Use environment variables or edit the file inc/cf-page-cache.php.
- Set the constans BYPASS_COOKIES_EXTRA (eg "wp-|wordpress") and NON_CACHEABLE_URLS_EXTRA (eg "/dist/|/go/|/tours") if you need. Use environment variables or edit the file inc/cf-page-cache.php.
- To manage preload cache use environment variables or edit the file inc/cfpc-class-preload-cache.php. If you need disable preload cache then set variable CF_IS_PRELOAD_CACHE as false and deactivate-activate plugin. To define how many page per minute will be cached use variable CF_PRELOAD_CACHE_PAGE_PER_MINUTE (by default 50 pages per minute).

== Frequently Asked Questions ==
= A question that someone might have =

== Screenshots ==
1. No screenshots

== Changelog ==

= 1.0 =

== Upgrade Notice ==
Upgrade normally
