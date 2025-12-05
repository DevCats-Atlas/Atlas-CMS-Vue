<template>
    <div class="wysiwig-editor-wrapper">
        <ckeditor
            v-model="editorData"
            :editor="ClassicEditor"
            :config="config"
        />
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

import {
	ClassicEditor,
	Autoformat,
	Bold,
	Italic,
	Underline,
	BlockQuote,
	Base64UploadAdapter,
	CloudServices,
	CKBox,
	Essentials,
	Heading,
	Image,
	ImageCaption,
	ImageResize,
	ImageStyle,
	ImageToolbar,
	ImageUpload,
	PictureEditing,
	Indent,
	IndentBlock,
	Link,
	List,
	MediaEmbed,
	Mention,
	Paragraph,
	PasteFromOffice,
	Table,
	TableColumnResize,
	TableToolbar,
	TextTransformation
} from 'ckeditor5';

import { Ckeditor } from '@ckeditor/ckeditor5-vue';

import 'ckeditor5/ckeditor5.css';

const props = defineProps({
    modelValue: {
        type: String,
        default: '',
    },
});

const emit = defineEmits(['update:modelValue']);

const editorData = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
});

const config = computed( () => {
    return {
        licenseKey: 'GPL', // Or 'GPL'.

        plugins: [
			Autoformat,
			BlockQuote,
			Bold,
			CloudServices,
			Essentials,
			Heading,
			Image,
			ImageCaption,
			ImageResize,
			ImageStyle,
			ImageToolbar,
			ImageUpload,
			Base64UploadAdapter,
			Indent,
			IndentBlock,
			Italic,
			Link,
			List,
			MediaEmbed,
			Mention,
			Paragraph,
			PasteFromOffice,
			PictureEditing,
			Table,
			TableColumnResize,
			TableToolbar,
			TextTransformation,
			Underline
		],
		toolbar: [
			'undo',
			'redo',
			'|',
			'heading',
			'|',
			'bold',
			'italic',
			'underline',
			'|',
			'link',
			'uploadImage',
			'ckbox',
			'insertTable',
			'blockQuote',
			'mediaEmbed',
			'|',
			'bulletedList',
			'numberedList',
			'|',
			'outdent',
			'indent'
		],

    };
} );
</script>

<style scoped>
.wysiwig-editor-wrapper :deep(.ck-editor__editable) {
    min-height: 250px;
}
</style>
