import { Theme } from 'vitepress'
import SiteTheme from './theme-init'
import { enhance } from './theme-init'

export default {
    extends: SiteTheme,
    enhanceApp(params) {
        enhance(params)
      }

} satisfies Theme