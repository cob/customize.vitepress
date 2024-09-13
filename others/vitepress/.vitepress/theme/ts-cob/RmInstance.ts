    import {DecoratedInstance, InstanceField} from "./schema";
    import {Dictionary} from "./Dictionary";
    import RmInstanceFile from "./RmInstanceFile";
    import { umLoggedin, rmGetInstance } from '@cob/rest-api-wrapper';
    import RmInstanceField from "./RmInstanceField";
    export default class RmInstance {

    private readonly instance: DecoratedInstance;
    // Allows for easy lookup by field name
    private readonly fieldsNameMap: Dictionary<RmInstanceField[]>;

    constructor(instance: DecoratedInstance) {
        this.instance = instance;
        this.fieldsNameMap = {};

        this.updateInternalDataStructure(instance.fields ?? [])
    }

    /**
     * Updates internal data structures for quick access and findings
     * @param fields the list of fields to analyze
     * @param parent the parent field
     * @private
     */
    private updateInternalDataStructure(fields: InstanceField[]) {

        const addOrPush = (field : RmInstanceField) => field.fieldDefinition.name in this.fieldsNameMap ?
            this.fieldsNameMap[field.fieldDefinition.name].push( field ) 
            : this.fieldsNameMap[field.fieldDefinition.name] = [field] 
        
        for(const sub of fields){
            const rmField = new RmInstanceField(sub)
            addOrPush( rmField )
            rmField.allFields.forEach( childrenField => addOrPush(childrenField) )    
        }

        // console.log(this.instance.instanceLabel[0])
        // console.log(this.fieldsNameMap)
        
    }

    private flattenFields(fields: InstanceField[]): InstanceField[] {
        // @ts-ignore
        return fields.flatMap(f => [f, ...this.flattenFields(f.fields || [])]);
    }

    get id() {
        return this.instance.id;
    }

    get version() {
        return this.instance.version;
    }

    /**
     * Lookup all instance fields with a specific name
     * @param name the name of the field to look for
     */
    field(name: string): RmInstanceField | null {
        return this.fieldsNameMap[name]?.[0] || null;
    }

    /**
     * Lookup all instance fields with a specific name.
     * @param name the name of the field to look for
     */
    fields(name: string): RmInstanceField[] {
        return this.fieldsNameMap[name] || [];
    }

    /**
     * Shortcut method to get the first value of a field of the Instance.
     * @param name the field name
     */
    value(name: string): string | undefined {
        const firstFieldWithValue = this.fieldsNameMap[name]
        return firstFieldWithValue ? firstFieldWithValue[0].value() : undefined
    }

    /**
     * Shortcut method to get the first value of a field of the Instance and turn it into a specific type
     * @param name the field name
     * @param transformer the transformer function to return the value as a specific type
     */
    private valueAndTransform<T>(name: string, transformer: (v: string) => T): (T | undefined) {
        const v = this.value(name)
        return v ? transformer(v) : undefined
    }


    /**
     * Shortcut method to get the first value of a field of the Instance as a number.
     * @param name the field name
     */
    public valueAsNumber(name: string): number | undefined {
        return this.valueAndTransform(name, (v: string) => parseInt(v, 10))
    }

    /**
     * Shortcut method to get the first value of a field of the Instance as a Date.
     * @param name the field name
     */
    public valueAsDate(name: string): Date | undefined {
        return this.valueAndTransform(name, (v: string) => new Date(parseInt(v, 10)))
    }

    /**
     * Shortcut method to get the first value of a field of the Instance as an RmInstanceFile.
     * @param name the field name
     */
    public valueAsFile(name: string): RmInstanceFile | undefined {
        let fileField = this.field(name);
        if (!fileField?.value) return undefined
        return new RmInstanceFile(this.id, fileField.fieldDefinition.id, fileField.value()!)
    }

    /**
     * Get all the values of fields with the specified name.
     * @param name the field name
     */
    values(name: string): string[] {
        const fields = this.fieldsNameMap[name] 
        return fields ? fields.map( f => f.value() ).filter(f => f) as string[] : []
    }

    /**
     * Get all the values of fields with the specified name as numbers
     * @param name the field name
     */
    valuesAsNumbers(name: string): number[] {
        return this.values(name).map(v => parseInt(v, 10))
    }

    /**
     * Get all the values of fields with the specified name as numbers
     * @param name the field name
     */
    valuesAsDates(name: string): Date[] {
        return this.values(name).map(v => new Date(parseInt(v, 10)))
    }

    /**
     * Shortcut method to get all values of a field of the Instance as an RmInstanceFile.
     * @param name the field name
     */
    public valuesAsFiles(name: string): RmInstanceFile[] {
        // Forced the cast because ts is not understanding that I'm filtering out undefined/null values
        return this.fields(name)
        .filter(f => !!f.value)
        .map(f => new RmInstanceFile(this.id, f.fieldDefinition.id, f.value()!));
    }

    /**
     * Veriify if this instance is updatable
     */
    canUpdate() {
        return !!this.instance._links.update;
    }

    
    static async getInst(id : number){

        return rmGetInstance(id) 
    }

    static async load(id: number) {
        try {
        const instance = await RmInstance.getInst(id);  
        return Promise.resolve(new RmInstance(instance));

        } catch (err) {
        console.error("Error loading instance with id", id);  
        return Promise.reject(err);
        }  
    }  
    }