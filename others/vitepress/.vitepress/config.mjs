import { defineConfig } from 'vitepress'
import { buildSite, clearSite } from './theme/schema-utils/site-builder'
import fs from "fs"
import { configure } from './configure'

//  not sure there's a better way to do this
// TODO Check better way to pass arguments

const domain = fs.readFileSync("domain", { encoding: 'utf8'})
const tag    = fs.readFileSync("tag", { encoding: 'utf8'})
await clearSite()
const site = await buildSite(domain, tag)

const locales = {
  root : {
    label : site.localeData.defaultLocale.label,
    lang  : site.localeData.defaultLocale.code,
    themeConfig : { sidebar:  site.sidebars[site.localeData.defaultLocale.code],
                    siteParams: site.parameters["root"]}
  }
}

for(const l of site.localeData.locales)
  if(l.code != site.localeData.defaultLocale.code)
    locales[l.code] = {
      label: l.label, lang: l.code, themeConfig :
       { sidebar:  site.sidebars[l.code], siteParams: site.parameters[l.code] }
    }

const index = {}
const buildIndexTree = (c) => {
  index[c.current.instanceId] = c.path

  if(c.children)
    c.children.forEach( buildIndexTree )
}

site.pages.forEach( p => {
  index[p.instanceId] = p.path
  if(p.content)
    p.content.L1s.forEach( buildIndexTree )
})

const params = site.pages.reduce( (paramObj, page) => {paramObj[page.path] = page.params ; return paramObj}, {})
const base = tag == "" ? undefined : `/${tag}/`

const baseConfig = {
  title: "Title of Site",
  base: base,
  ignoreDeadLinks: true,
  locales: locales,
  themeConfig: {
    pageParams: params,
    navLayout: site.navbarLayout,
    footerLayout: site.footerLayout,
    i18nRouting: true,
    outline:  [1,6],
    aside: true,
    index: index
  },
  transformPageData(pageData) {
    if(pageData.params && pageData.params.layout)
      return { frontmatter: {...pageData.frontmatter, layout: pageData.params.layout} }
    else
      return {}
  }
}


// https://vitepress.dev/reference/site-config
export default defineConfig( configure(baseConfig) )
