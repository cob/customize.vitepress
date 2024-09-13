import { group } from "console";
import RmInstance from "../ts-cob/RmInstance"
import RmInstanceField from "../ts-cob/RmInstanceField"
import { rmDefinitionSearch } from '@cob/rest-api-wrapper';
import { Locale  } from '../schema/template-parameters';
import {  LocaleData } from "../schema/site";


// Receives a list of [order, _] where the obtains the element with the speficic order 
const getOrdered = (orderTaggedList: [number, any][], order: number) =>
    orderTaggedList.find(([o, l]) => o == order)


interface StructuredGroups {
    [key: string]: [number, StructuredGroup][]
}

interface StructuredGroup {
    [key: string]: [number, string][]
}

// Creates the parameters of a locale (with the same structure as the return of buildLocale)
// It does so by changing the fallback parameters where there is a value and retaining the 
// fallback parameters as they were.
function buildLocale(hitts: any[], locale: string, fallbackParams: StructuredGroups) {

    const start = structuredClone(fallbackParams)

    
    const hits = hitts.filter( h => h.locale_reference[0] == locale )
    
    for (const hit of hits) {
        const groupName = hit.group[0]
        const groupOrder = parseInt(hit.group_order[0])
        const value = hit.value[0]
        const paramOrder = parseInt(hit.parameter_order[0])
        const name = hit.name[0]

    
        const params = getOrdered(start[groupName], groupOrder)?.[1][name]
        const paramInFallback = getOrdered(params, paramOrder) 
        if(!paramInFallback)
            throw new Error (`Fallback of ${locale} does not have parameter [${paramOrder}, ${name}], of group [${groupOrder}, ${groupName}]` )
        
        paramInFallback[1] = value
    }

    return start

}

// Builds a dictionary to hold the parameters of a page
// it does so as 
// {
//    group_name  : [ [order_1, {param} ], [order_0, {param}] ],
//    group_name2 : [ [order_0, {param} ], [order_1, {param}] ],
// }
//
// where {param} : 
// {
//   param_name  : [ [order_1, value_1 ], [order_0, value_0] ] 
// }
//
// The lists are not ordered - they old the order as a parameter.
function buildDefault(hitts: any[], locale : string )  {

    const hits = hitts.filter( h => h.locale_reference[0] == locale )

    const groups: StructuredGroups = {}

    for (const hit of hits) {
        // Ignore if any of the values are not there
        if(!hit.group || !hit.group_order || !hit.value || !hit.parameter_order || !hit.name )
            continue 


        const groupName = hit.group[0]
        const groupOrder = parseInt(hit.group_order[0])
        const value = hit.value[0]
        const paramOrder = parseInt(hit.parameter_order[0])
        const name = hit.name[0]

        if (!(groupName in groups))
            groups[groupName] = []

        let current = getOrdered(groups[groupName], groupOrder)?.[1]

        if (!current) {
            current = {}
            groups[groupName].push([groupOrder, current])
        }


        if (!(name in current))
            current[name] = []

        current[name].push([paramOrder, value])


    }

    return groups

}

// flattens the structred groups into a normal dictionary 
// by taking their 'order' parameters and  ordering the values and groups
// according to those.
function flattenGroup( g : StructuredGroups ) {
      const gs: Locale = {}


        for (const [groupName, groupsWithName] of Object.entries(g)) {
            const g = groupsWithName.sort((a, b) => a[0] - b[0]).map(g => g[1])

            gs[groupName] = []

            for (const gro of g) {

                const ps = {}

                for (const [paramName, paramsWithName] of Object.entries(gro)) 
                    ps[paramName] = paramsWithName.sort((a, b) => a[0] - b[0]).map(p => p[1])

                gs[groupName].push(ps)
            }
        }

        return gs

    }


// Function that takes in an instance and builds the template
// parameters from it, organizing them so they are easily
// accessed by layouts
export async function buildTemplates(instance: RmInstance, localeData : LocaleData) {
    const template = {}
 
    const parameterStructures : { [key: string] : StructuredGroups } = {} 
 
    const hits = await rmDefinitionSearch("Layout Parameters", `page:${instance.id} || site:${instance.id} `, 0, 500)
        .then(resp => resp.hits.hits.map(hit => hit._source))


    const defaultCode = localeData.defaultLocale.code
    const defaultStruct = buildDefault(hits, defaultCode )
    parameterStructures[defaultCode] = defaultStruct

    // TODO chain locales

    for(const loc of localeData.locales.filter( l => l.code != defaultCode)){
        const fallback = parameterStructures[localeData.fallbacks[loc.code]]
        parameterStructures[loc.code] = buildLocale(hits, loc.code, fallback)
    }

    for( const [loc, struct] of Object.entries(parameterStructures))
        template[loc == defaultCode ? "root" : loc] = flattenGroup(struct)

    return template
}