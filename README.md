# customize.vitepress

Allows the generation of a static site via [Vitepress](https://vitepress.dev/). It is meant to allow RecordM to act as a Content Management System. 

This customization splits content, structure and styling. The necessary definitions can be found in `/others/customize.vitepress/definition/`. The basic idea is that `Contents` are atomic and are structured via `Site Pages`. The aspect they have on the generated page is dependent on the `Layouts`. Layouts have a mapping to a vue component which is applied to them. 

# Setup

After installing the customization, you need to install a theme with it. There are two existing themes that serve different purposes:
- Documentation theme (add link)
- Organization theme  (add link)

Two files must be added to this customization for it to work.
1. In the directory `others/vitepress/.vitepress` you must add a `configure.js` file which exports a `configure` function, that takes a `baseConfig` argument. It should return an instance of [`SiteConfig`](https://vitepress.dev/reference/site-config) from vitepress. This is where config-related customizations are added.
2. In the directroy `others/vitepress/.vitepress/theme` you must add a `theme-init.ts`. The default export of which should be the [`Theme`](https://vitepress.dev/guide/custom-theme#theme-interface) object to use by vitepress. It should also export a function called `enhance` which receives an object argument `{app, router, site}`, this function is the [`enhanceApp`]((https://vitepress.dev/guide/custom-theme#theme-interface)) function called by vitepress. 

