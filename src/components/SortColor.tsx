import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownToDot, Blend, DownloadIcon, Eclipse, SunMoon } from 'lucide-react';

interface DownloadSize {
    width: number;
    height: number;
}

interface SortColorProps {
    sortBy: string;
    setSortBy: (sort: string) => void;
}

function SortColor({
    sortBy,
    setSortBy
}: SortColorProps) {
    return (
        <Card className="te-card p-1">
            <CardContent className="p-1 gap-1">
             
                <div className="flex flex-col gap-4 w-full">
                    <div className="flex flex-col gap-2">
                        <Label className="te-label block mb-1">SORT BY :</Label>
                        <div className="grid grid-cols-4 gap-2">
                            <Button
                                variant="outline"
                                title='Default'
                                className={`aspect-square p-0 ${sortBy === 'default' ? 'bg-black text-white' : 'bg-gray-100'}`}
                                onClick={() => setSortBy('default')}
                            >
                                <ArrowDownToDot className="rotate-180 h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                title='Random Darkness'
                                className={`aspect-square p-0 ${sortBy === 'darkness' ? 'bg-black text-white' : 'bg-gray-100'}`}
                                onClick={() => setSortBy('darkness')}
                            >
                                <Eclipse className="rotate-180 h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                title='Random Lightness'
                                className={`aspect-square p-0 ${sortBy === 'lightness' ? 'bg-black text-white' : 'bg-gray-100'}`}
                                onClick={() => setSortBy('lightness')}
                            >
                                <SunMoon className="rotate-180 h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                title='Random Saturation'
                                className={`aspect-square p-0 ${sortBy === 'saturation' ? 'bg-black text-white' : 'bg-gray-100'}`}
                                onClick={() => setSortBy('saturation')}
                            >
                                <Blend className="rotate-180 h-4 w-4" />
                            </Button>
                           
                        </div>

                    </div>

                </div>
            </CardContent>
        </Card>
    );
}

export default SortColor;
