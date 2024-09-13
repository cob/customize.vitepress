<div v-if="$params.restrictions.length > 0">
<RestrictedContent :instance="$params.instance">

::: warning

You not have permission to access this content!

:::

</RestrictedContent> 
</div>
<div v-else>

<!--@content-->

</div>