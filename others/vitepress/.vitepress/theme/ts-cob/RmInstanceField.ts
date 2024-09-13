    import { Dictionary } from './Dictionary';
    import RmInstance from './RmInstance';
    import RmInstanceFile from './RmInstanceFile';
    import { DecoratedInstance, Instance, InstanceField } from './schema';


    export default class RmInstanceField {

        private readonly data: InstanceField;
    
        readonly fieldsNameMap: Dictionary<RmInstanceField[]>

        readonly allFields : RmInstanceField[];

        constructor (field : InstanceField) {
            this.data = field
            this.fieldsNameMap = {}
            this.allFields =  (this.data.fields ?? []).map( f => new RmInstanceField(f)) 
            this.updateInternalDataStructure(this.data.fields || []);
        }    

        private updateInternalDataStructure(fields: InstanceField[])  {
            
        const addOrPush = (field : RmInstanceField) => field.fieldDefinition.name in this.fieldsNameMap ?
        this.fieldsNameMap[field.fieldDefinition.name].push( field ) 
        : this.fieldsNameMap[field.fieldDefinition.name] = [field] 
            // field.label in this.fieldsNameMap ? 
            //     this.fieldsNameMap[field.label] = [field] 
            //     : this.fieldsNameMap[field.label].push(field)
            
            for(const f of fields) {
                const rmField = new RmInstanceField(f)
                addOrPush( rmField )
                rmField.allFields.forEach( childrenField => addOrPush(childrenField) )    
            }

        }


        get fieldDefinition() {
            return this.data.fieldDefinition    
        }


        get label() { return this.data.label } 

        
        get id() {
            return this.data.id;
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
        value(name?: string): string | undefined {
            if(!name){
                return this.data.value;
            } else {
                const field = this.fieldsNameMap[name]          
                return field ? field[0].value() : undefined
            }
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
    public valueAsNumber(name?: string): number | undefined {
        if(name)    
            return this.valueAndTransform(name, (v: string) => parseInt(v, 10))
        else 
             return this.value() ? parseInt(this.value()!, 10) : undefined
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
        // Forced the cast because ts is not understanding that I'm filtering out undefined/null values
        return (this.fieldsNameMap[name] ?? []).map(f => f.value()).filter(f => f) as string[]
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

        
    }