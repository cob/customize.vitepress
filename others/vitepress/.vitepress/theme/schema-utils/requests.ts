

const MAX = 2

/**
 * Performs a series of requests in a sequence, maximizing parallistm. It'll send an `overide` number of requests in parallel, wait for those to finish and repeat, untill all have been sent.
 * @param callers list of functions to call in a sequence.
 * @param overide default: 16. Specifies how many requests in paralle there can be.
 * @returns the results of calling them.
 */
export default async function sendRequests<V>( callers : (() => Promise<V>)[], overide = MAX ) : Promise<V[]> {

    const results : V[] = []
    let promises: Promise<V>[] = []

    for (const func of callers) {
        if (promises.length < overide) {
            promises.push( func() )
        } else {
            results.push(...await Promise.all(promises))
            promises = [ func() ]
        }
    }
    results.push(...await Promise.all(promises))

    return results
}



