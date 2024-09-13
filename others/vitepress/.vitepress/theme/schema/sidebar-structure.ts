

export interface Sidebar {
  [path: string]: SidebarItem[]
}

export interface SidebarItem {
  text?: string
  link?: string
  items?: SidebarItem[]
  collapsed?: boolean
  restrictions: string[]
}