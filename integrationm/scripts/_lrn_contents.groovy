import com.cultofbits.integrationm.service.dictionary.recordm.RecordmMsg

if(msg.definitionName == "Contents" && msg.value("Development Status") == "In Development" ) {

    if(relevantFieldsChanges(msg)){
        def changesInstance = msg.value("Changes", Integer) as Integer
        if(changesInstance)
            recordm.update("Changes", changesInstance, ["Estado Deploy" : "", "Estado Index" : ""])
    }

    if(msg.action == "add") {

        def originId = msg.value("Origin")
        if(originId != null) {
            def origin = recordm.get(originId).body

            def names = origin.values("Name")
            def locs = origin.values("Locale")
            def text = origin.values("Content")
            def tags = origin.values("Tags")
            def visi = origin.values("Visibility")
            def accessGrs = origin.values("Audience Group")

            recordm.update("LRN Files", "contents:$origin.id", ["Contents[+]" : msg.id])

        def updates = [
                "Tags" : tags, "Visibility" : visi, "Audience Group" : accessGrs
        ]

        names.eachWithIndex{ String entry, int i ->
            updates["Name[$i]"] = entry
            updates["Name[$i]/Locale"] = locs[i]
            updates["Name[$i]/Content"] = text[i]
        }

        recordm.update("Contents", msg.id, updates)
    }
}

static def relevantFieldsChanges(RecordmMsg msg) {
    return msg.field("Name").changed() ||
            msg.field("Content").changed() ||
            msg.field("Development Status").changed() ||
            msg.field("Locale").changed()
}