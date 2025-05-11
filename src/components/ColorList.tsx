import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CheckIcon, GripVerticalIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ColorItem {
  id: string;
  color: string;
  isVisible: boolean;
}

interface ColorListProps {
  colorItems: ColorItem[];
  isLoadingColors: boolean;
  toggleColorVisibility: (id: string) => void;
  onChange: (oldIndex: number, newIndex: number) => void;
}

interface SortableColorItemProps {
  id: string;
  color: string;
  isVisible: boolean;
  toggleVisibility: (id: string) => void;
}

function ColorList({
  colorItems,
  isLoadingColors,
  toggleColorVisibility,
  onChange
}: ColorListProps) {
  // --- Drag and Drop Setup ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;
    if (active.id === over.id) return;

    // Get the old and new indices
    const oldIndex = colorItems.findIndex(item => item.id === active.id);
    const newIndex = colorItems.findIndex(item => item.id === over.id);

    onChange(oldIndex, newIndex);
  }

  function copyColor(e: any, color: string) {
    navigator.clipboard.writeText(color)
      .then(() => {
        const copied = e.target.querySelector(".copied");

        copied.classList.remove('hidden')
        setTimeout(() => {
          copied.classList.add('hidden')
        }, 1000);
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
      });
  }

  return (
    <Card className="te-card p-1 grow flex items-stretch w-full">
      <CardContent className="p-1 gap-1 grow flex items-stretch justify-stretch w-full ">
        <Tabs defaultValue="effects" className=' w-full'>
          <TabsList className="grid grid-cols-2 bg-gray-100 rounded-none w-full">
            <TabsTrigger value="effects" className="magnetic-target cursor-none te-label data-[state=active]:bg-black data-[state=active]:text-white rounded-none">COLOR LIST {isLoadingColors && '(Loading...)'}</TabsTrigger>
            <TabsTrigger value="download" className="magnetic-target cursor-none te-label data-[state=active]:bg-black data-[state=active]:text-white rounded-none">COLOR PALETTE {isLoadingColors && '(Loading...)'}</TabsTrigger>
          </TabsList>
          <TabsContent value="effects" className="space-y-2 grow flex items-stretch justify-stretch w-full">
            <div className="bg-gray-100 border border-gray-200 p-0  grow flex items-stretch justify-stretch overflow-y-auto w-full">
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
                    <div className="divide-y divide-gray-200 w-full ">
                      {colorItems.map(item => (
                        <SortableColorItem
                          key={item.id}
                          id={item.id}
                          color={item.color}
                          isVisible={item.isVisible}
                          toggleVisibility={toggleColorVisibility}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className=" w-full flex items-center justify-center text-gray-600 text-center text-sm">
                  {isLoadingColors ? 'Loading...' : 'No colors extracted yet.'}
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="download" className='grow flex items-stretch justify-stretch  w-full'>
            <div className="bg-gray-100 border border-gray-200 p-0  grow flex  overflow-y-auto w-full">
              {colorItems.length > 0 ? (
                <div className='w-full'>
                  <div className="grid grid-cols-3 w-full">
                    {colorItems.map(item => (
                      <div key={item.id} className='magnetic-target w-full h-14 px-4 py-2 relative overflow-hidden' onClick={(e) => {
                        copyColor(e, item.color);
                      }} style={{ backgroundColor: item.color, opacity: !item.isVisible ? 0.3 : 1 }}>
                        <div className='absolute -top-2 -right-2 h-4 w-4 bg-black rotate-45 border border-white'></div>
                        <div className='copied absolute bottom-0 left-0 right-0 hidden p-2 text-xs text-center'>Copied!</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className=" w-full flex items-center justify-center text-gray-600 text-center text-sm">
                  {isLoadingColors ? 'Loading...' : 'No colors extracted yet.'}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

      </CardContent>
    </Card>
  );
}

// --- Sortable Color Item Component ---
function SortableColorItem({ id, color, isVisible, toggleVisibility }: SortableColorItemProps) {
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
    <div ref={setNodeRef} style={style}
      className={`magnetic-target flex items-center py-2 px-2 bg-white ${isDragging ? 'dragging' : ''} ${!isVisible ? 'opacity-50' : ''}`}
      {...attributes}>
      <div className="flex items-center flex-1" >
        <GripVerticalIcon className="h-4 w-4 text-gray-400 mr-2" {...listeners} />
        <div
          className="h-6 w-6 rounded-sm mr-2"
          style={{ backgroundColor: color, opacity: !isVisible ? 0.3 : 1 }}
        ></div>
        <span className="font-mono text-xs">{color}</span>
      </div>
      <Checkbox
        id="showGradientStops"
        checked={isVisible}
        onCheckedChange={(checked: boolean) => toggleVisibility(id)}
        className="rounded-none border-black magnetic-target"
      />

    </div>

  );
}

export default ColorList;
