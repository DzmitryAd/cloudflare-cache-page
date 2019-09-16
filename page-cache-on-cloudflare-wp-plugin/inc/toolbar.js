window.addEventListener("load", function() {
	jQuery(document).ready(function() {
		jQuery("body").append('<div id="cf-revert-loader-toolbar"></div>')
		jQuery("#wp-admin-bar-cfpc-update-cache-version").click(function(e) {
			if (typeof ajaxurl != "undefined") {
				action = "cfpc_update_cache_version"
				jQuery("#cf-revert-loader-toolbar").show()
				jQuery.ajax({
					type: "POST",
					url: ajaxurl,
					data: {
						action: action,
						path: window.location.pathname,
						is_ajax: true
					},
					dataType: "json",
					cache: false,
					success: function(data) {
						jQuery("#cf-revert-loader-toolbar").hide()
						if (!data || !data.data) {
							alert("Failed to update cloudflare cache version!")
						}
					}
				})
			} else {
				alert("AjaxURL has NOT been defined")
			}
		})
	})
})
