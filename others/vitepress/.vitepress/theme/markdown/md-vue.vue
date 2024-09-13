<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { createMarkdownRenderer } from './markdown';

const props = defineProps<{
    raw: string,
    inline: boolean  
}>() 

if(!window.mdrenderer)
    window.mdrenderer = createMarkdownRenderer()

//const rendered = ref(new MarkdownIt().render(props.raw))
const rendered = ref('')

watch(props, () => {
    console.log(props.raw)
    window.mdrenderer.then( re => rendered.value = props.inline ? re.renderInline(props.raw) : re.render( props.raw ))
})
window.mdrenderer.then( re => rendered.value = props.inline ? re.renderInline(props.raw) : re.render( props.raw ))
</script>


<template>
    <div v-html="rendered"></div>
</template>
