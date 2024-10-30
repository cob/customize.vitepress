import { TextualContent } from "./textual-content"

export interface ContentTree {
    layout: string
    L1s: ContentNode[]
}

export interface ContentNode {
    path: string,
    current: Content 
    children?: ContentNode[]
}

export interface Content {
    replaces?: number
    instanceId: number,
    locales: TextualContent[]
}