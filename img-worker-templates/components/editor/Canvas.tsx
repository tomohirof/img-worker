'use client';

import { Template, TextElement as TextElementType } from '@/lib/api';
import { TextElement } from './TextElement';
import { useRef, useCallback } from 'react';

interface DragState {
  type: 'move' | 'resize';
  elementId: string;
  startX: number;
  startY: number;
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
}

interface Props {
  template: Template;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<TextElementType>) => void;
}

export function Canvas({
  template,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
}: Props) {
  const dragStateRef = useRef<DragState | null>(null);
  const { width, height, background, elements } = template;

  const handleCanvasClick = useCallback(() => {
    onSelectElement(null);
  }, [onSelectElement]);

  const startDrag = useCallback(
    (e: React.PointerEvent, elementId: string, type: 'move' | 'resize') => {
      e.preventDefault();
      onSelectElement(elementId);

      const element = elements.find((el) => el.id === elementId);
      if (!element) return;

      if (type === 'move') {
        dragStateRef.current = {
          type: 'move',
          elementId,
          startX: e.clientX,
          startY: e.clientY,
          initialX: element.x,
          initialY: element.y,
        };
      } else {
        dragStateRef.current = {
          type: 'resize',
          elementId,
          startX: e.clientX,
          startY: e.clientY,
          initialWidth: element.maxWidth || 200,
          initialHeight: element.maxHeight || 100,
        };
      }

      document.addEventListener('pointermove', onDragMove);
      document.addEventListener('pointerup', onDragEnd);
    },
    [elements, onSelectElement]
  );

  const onDragMove = useCallback(
    (e: PointerEvent) => {
      if (!dragStateRef.current) return;

      const dragState = dragStateRef.current;
      const element = elements.find((el) => el.id === dragState.elementId);
      if (!element) return;

      if (dragState.type === 'move') {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;

        const newX = Math.max(
          0,
          Math.min(width - 50, (dragState.initialX || 0) + dx)
        );
        const newY = Math.max(
          0,
          Math.min(height - 20, (dragState.initialY || 0) + dy)
        );

        onUpdateElement(dragState.elementId, { x: newX, y: newY });
      } else if (dragState.type === 'resize') {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;

        const newWidth = Math.max(50, (dragState.initialWidth || 200) + dx);
        const newHeight = Math.max(20, (dragState.initialHeight || 100) + dy);

        onUpdateElement(dragState.elementId, {
          maxWidth: newWidth,
          maxHeight: newHeight,
        });
      }
    },
    [elements, width, height, onUpdateElement]
  );

  const onDragEnd = useCallback(() => {
    dragStateRef.current = null;
    document.removeEventListener('pointermove', onDragMove);
    document.removeEventListener('pointerup', onDragEnd);
  }, [onDragMove]);

  // Cleanup on unmount
  useCallback(() => {
    return () => {
      document.removeEventListener('pointermove', onDragMove);
      document.removeEventListener('pointerup', onDragEnd);
    };
  }, [onDragMove, onDragEnd]);

  const getBackgroundStyle = (): React.CSSProperties => {
    if (background.type === 'color') {
      return { background: background.value };
    } else if (background.type === 'image' || background.type === 'upload') {
      return {
        backgroundImage: `url(${background.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return { background: '#ffffff' };
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-auto p-6">
      <div
        className="relative mx-auto shadow-xl cursor-default"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          ...getBackgroundStyle(),
        }}
        onClick={handleCanvasClick}
      >
        {elements.map((element) => (
          <TextElement
            key={element.id}
            element={element}
            isSelected={element.id === selectedElementId}
            canvasWidth={width}
            canvasHeight={height}
            onSelect={() => onSelectElement(element.id)}
            onDragStart={(e) => startDrag(e, element.id, 'move')}
            onResizeStart={(e) => startDrag(e, element.id, 'resize')}
          />
        ))}
      </div>
    </div>
  );
}
