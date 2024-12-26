import { defineConfig } from 'vitepress'
import { buildSite, clearSite } from './theme/schema-utils/site-builder'
import { configure } from './configure'
import { auth, setServer } from "@cob/rest-api-wrapper"

if(!process.env.SERVER || !process.env.TOKEN || !process.env.DOMAIN || !process.env.BASE)
   throw new Error("SERVER, TOKEN, DOMAIN and BASE are mandatory")

setServer(process.env.SERVER)
await auth({ token : process.env.TOKEN })
const domain = process.env.DOMAIN 
const tag    = process.env.TAG ?? ''
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
  index[c.current.replaces ?? c.current.instanceId] = c.path
  
  if(c.children)
    c.children.forEach( buildIndexTree )
}

site.pages.forEach( p => {
  index[p.replaces ?? p.instanceId] = p.path
  if(p.content)
    p.content.L1s.forEach( buildIndexTree )
})

const params = site.pages.reduce( (paramObj, page) => {paramObj[page.path] = page.params ; return paramObj}, {})
const base = tag == "" ? `/${process.env.BASE}/` : `/${process.env.BASE}/${tag}/`

const baseConfig = {
  title: "Title of Site",
  base: base,
  ignoreDeadLinks: true,
  locales: locales,
  srcExclude: ['**/README.md'],
  themeConfig: {
    tag: tag, 
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
