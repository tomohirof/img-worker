'use client';

import { TextElement as TextElementType } from '@/lib/api';

interface Props {
  element: TextElementType;
  isSelected: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onSelect: () => void;
  onDragStart: (e: React.PointerEvent) => void;
  onResizeStart: (e: React.PointerEvent) => void;
}

export function TextElement({
  element,
  isSelected,
  canvasWidth,
  canvasHeight,
  onSelect,
  onDragStart,
  onResizeStart,
}: Props) {
  return (
    <div
      className={`absolute cursor-move border-2 p-1 select-none whitespace-pre-wrap break-words transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-transparent hover:border-blue-500 hover:bg-blue-500/5'
      }`}
      data-id={element.id}
      style={{
        left: `${element.x}px`,
        top: `${element.y}px`,
        fontSize: `${element.fontSize}px`,
        fontFamily: element.fontFamily,
        color: element.color,
        fontWeight: element.fontWeight,
        textAlign: element.textAlign,
        width: element.maxWidth ? `${element.maxWidth}px` : 'auto',
        height: element.maxHeight ? `${element.maxHeight}px` : 'auto',
        lineHeight: 1.2,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerDown={onDragStart}
    >
      [{element.variable}]
      {isSelected && (
        <div
          className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize"
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeStart(e);
          }}
        />
      )}
    </div>
  );
}
