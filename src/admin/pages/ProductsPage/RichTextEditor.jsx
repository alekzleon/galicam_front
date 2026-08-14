import { useEffect, useRef } from "react"
import pell from "pell"
import "pell/dist/pell.css"

function RichTextEditor({ value, onChange, disabled = false }) {
  const wrapperRef = useRef(null)
  const editorRef = useRef(null)
  const lastValueRef = useRef(value || "")

  useEffect(() => {
    if (!wrapperRef.current || editorRef.current) return

    const editor = pell.init({
      element: wrapperRef.current,
      defaultParagraphSeparator: "p",
      styleWithCSS: false,
      actions: [
        "heading1",
        "paragraph",
        "bold",
        "italic",
        "underline",
        "olist",
        "ulist",
        "link",
        "image",
        "quote",
        "code",
      ],
      onChange: (html) => {
        lastValueRef.current = html
        onChange(html)
      },
    })

    editorRef.current = editor
    editor.content.innerHTML = lastValueRef.current
  }, [onChange])

  useEffect(() => {
    const nextValue = value || ""

    if (!editorRef.current || nextValue === lastValueRef.current) return

    lastValueRef.current = nextValue
    editorRef.current.content.innerHTML = nextValue
  }, [value])

  useEffect(() => {
    if (!editorRef.current) return

    editorRef.current.content.contentEditable = disabled ? "false" : "true"
  }, [disabled])

  return <div className="product-rich-editor" ref={wrapperRef} />
}

export default RichTextEditor
