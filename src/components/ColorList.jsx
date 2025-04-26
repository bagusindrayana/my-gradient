import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function ColorList({ 
  colorItems, 
  isLoadingColors, 
  toggleColorVisibility,
  onChange
}) {
  // --- Drag and Drop Setup ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;

    if (active.id !== over.id) {
      // Get the old and new indices
      const oldIndex = colorItems.findIndex(item => item.id === active.id);
      const newIndex = colorItems.findIndex(item => item.id === over.id);

      onChange(oldIndex, newIndex);


      
    }
  }

  return (
    <section className="card p-4 shadow-soft">
      <h2 className="section-header">
        Color List {isLoadingColors && '(Loading...)'}
      </h2>
      <div className="w-full">
        {colorItems.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={colorItems} // Pass items with unique IDs
              strategy={verticalListSortingStrategy}
            >
              <ul className="list-none p-0 m-0 w-full">
                {colorItems.map(item => (
                  <SortableColorItem
                    key={item.id}
                    id={item.id}
                    color={item.color}
                    isVisible={item.isVisible}
                    toggleVisibility={toggleColorVisibility}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="min-h-[250px] flex items-center justify-center text-gray-500 text-center">
            {isLoadingColors ? 'Loading...' : 'No colors extracted yet.'}
          </div>
        )}
      </div>
    </section>
  );
}

// --- Sortable Color Item Component ---
function SortableColorItem({ id, color, isVisible, toggleVisibility }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging, // Added to style the item while dragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`color-item ${isDragging ? 'dragging' : ''} ${!isVisible ? 'opacity-50' : ''}`}
      {...attributes} // Spread attributes for a11y etc.
    >
      <span
        className="drag-handle px-1"
        {...listeners} // Spread listeners onto the handle
        title="Drag to reorder"
      >
        ☰
      </span>
      <span
        className="color-swatch ml-2"
        style={{ backgroundColor: color, opacity: !isVisible ? 0.3 : 1 }}
      ></span>
      <span className="flex-grow ml-2 font-mono text-sm">{color}</span>
      <input
        type="checkbox"
        checked={isVisible}
        onChange={() => toggleVisibility(id)}
        title="Show/Hide Color"
        className="custom-checkbox ml-auto"
      />
    </li>
  );
}

export default ColorList; 