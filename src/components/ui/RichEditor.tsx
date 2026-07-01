import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Palette, Eraser, IndentDecrease, IndentIncrease, ChevronDown, Check } from 'lucide-react';

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});

const Indent = Extension.create({
  name: 'indent',
  addOptions() {
    return {
      types: ['paragraph', 'heading', 'blockquote'],
      minLevel: 0,
      maxLevel: 8,
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: element => parseInt(element.style.paddingLeft || '0') / 24,
            renderHTML: attributes => {
              if (!attributes.indent) {
                return {};
              }
              return {
                style: `padding-left: ${attributes.indent * 24}px`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      indent: () => ({ tr, state, dispatch }) => {
        const { selection } = state;
        tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            const indent = node.attrs.indent || 0;
            if (indent < this.options.maxLevel) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                indent: indent + 1,
              });
            }
          }
        });
        if (dispatch) dispatch(tr);
        return true;
      },
      outdent: () => ({ tr, state, dispatch }) => {
        const { selection } = state;
        tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
          if (this.options.types.includes(node.type.name)) {
            const indent = node.attrs.indent || 0;
            if (indent > this.options.minLevel) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                indent: indent - 1,
              });
            }
          }
        });
        if (dispatch) dispatch(tr);
        return true;
      },
    };
  },
});

interface RichEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
  onTextChange?: (text: string) => void;
}

const FONT_SIZES = [
  { label: '小', value: '12px' },
  { label: '標準', value: '16px' },
  { label: '大', value: '24px' },
  { label: '特大', value: '32px' }
];

const COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
  '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
  '#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47',
  '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130'
];

const MenuBar = ({ editor }: { editor: any }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!editor) return null;

  const currentFontSize = editor.getAttributes('textStyle').fontSize || '16px';
  const currentTextColor = editor.getAttributes('textStyle').color || '#000000';
  const currentBgColor = editor.getAttributes('highlight').color || '#ffffff';

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2 rounded-t-xl relative">
      <button
        type="button"
        onClick={() => {
          editor.chain().focus().unsetAllMarks().clearNodes().run();
        }}
        className="p-2 rounded hover:bg-slate-200 transition-colors text-slate-600"
        title="清除格式"
      >
        <Eraser className="w-4 h-4" />
      </button>
      
      <div className="w-px h-6 bg-slate-300 mx-1"></div>

      <div className="relative group flex items-center">
        <select
          className="appearance-none bg-transparent hover:bg-slate-200 border-none rounded px-2 py-1.5 pr-6 text-sm text-slate-700 cursor-pointer outline-none focus:ring-0"
          value={currentFontSize}
          onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
          title="文字大小"
        >
          {FONT_SIZES.map(size => (
            <option key={size.value} value={size.value}>{size.label}</option>
          ))}
        </select>
        <ChevronDown className="w-3 h-3 absolute right-2 pointer-events-none text-slate-500" />
      </div>

      <div className="w-px h-6 bg-slate-300 mx-1"></div>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('bold') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="粗體"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('italic') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="斜體"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('underline') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="底線"
      >
        <UnderlineIcon className="w-4 h-4" />
      </button>
      
      <div className="relative" ref={colorPickerRef}>
        <button
          type="button"
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="p-2 rounded hover:bg-slate-200 transition-colors text-slate-600 flex items-center gap-1"
          title="文字與背景顏色"
        >
          <div className="flex flex-col items-center">
            <span className="font-serif font-bold text-xs leading-none" style={{ color: currentTextColor }}>A</span>
            <div className="w-3 h-1 mt-0.5" style={{ backgroundColor: currentTextColor }}></div>
          </div>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-4 z-50 flex gap-6 w-max max-w-[90vw]">
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">背景顏色</div>
              <div className="grid grid-cols-10 gap-1">
                {COLORS.map(color => (
                  <button
                    key={`bg-${color}`}
                    onClick={() => {
                      if (color === '#ffffff') {
                        editor.chain().focus().unsetHighlight().run();
                      } else {
                        editor.chain().focus().setHighlight({ color }).run();
                      }
                      setShowColorPicker(false);
                    }}
                    className={`w-4 h-4 rounded-sm border ${color === '#ffffff' ? 'border-slate-300' : 'border-transparent'} hover:scale-110 transition-transform relative`}
                    style={{ backgroundColor: color }}
                    title={color}
                  >
                    {currentBgColor === color && (
                      <Check className={`w-3 h-3 absolute inset-0 m-auto ${['#ffffff', '#efefef', '#f3f3f3', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc'].includes(color) ? 'text-black' : 'text-white'}`} />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">文字顏色</div>
              <div className="grid grid-cols-10 gap-1">
                {COLORS.map(color => (
                  <button
                    key={`text-${color}`}
                    onClick={() => {
                      if (color === '#000000') {
                        editor.chain().focus().unsetColor().run();
                      } else {
                        editor.chain().focus().setColor(color).run();
                      }
                      setShowColorPicker(false);
                    }}
                    className={`w-4 h-4 rounded-sm border ${color === '#ffffff' ? 'border-slate-300' : 'border-transparent'} hover:scale-110 transition-transform relative`}
                    style={{ backgroundColor: color }}
                    title={color}
                  >
                    {currentTextColor === color && (
                      <Check className={`w-3 h-3 absolute inset-0 m-auto ${['#ffffff', '#efefef', '#f3f3f3', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc'].includes(color) ? 'text-black' : 'text-white'}`} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-6 bg-slate-300 mx-1"></div>
      
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('bulletList') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="項目符號"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded hover:bg-slate-200 transition-colors ${editor.isActive('orderedList') ? 'bg-slate-200 text-slate-900' : 'text-slate-600'}`}
        title="編號列表"
      >
        <ListOrdered className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-slate-300 mx-1"></div>

      <button
        type="button"
        onClick={() => editor.chain().focus().outdent().run()}
        className="p-2 rounded hover:bg-slate-200 transition-colors text-slate-600"
        title="減少縮排"
      >
        <IndentDecrease className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().indent().run()}
        className="p-2 rounded hover:bg-slate-200 transition-colors text-slate-600"
        title="增加縮排"
      >
        <IndentIncrease className="w-4 h-4" />
      </button>
    </div>
  );
};

export function RichEditor({ initialContent, onChange, onTextChange }: RichEditorProps) {
  const [contentInitialized, setContentInitialized] = useState(false);
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontSize,
      Indent,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none w-full focus:outline-none p-4 min-h-[300px] text-left',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      if (onTextChange) {
        onTextChange(editor.getText());
      }
    },
  });

  useEffect(() => {
    if (editor && !contentInitialized && initialContent) {
      editor.commands.setContent(initialContent);
      setContentInitialized(true);
      // Trigger text change immediately for initial word count
      if (onTextChange) { 
        onTextChange(editor.getText());
      }
    }
  }, [editor, initialContent, contentInitialized, onTextChange]);

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white flex flex-col focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500 transition-all h-full">
      <MenuBar editor={editor} />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
