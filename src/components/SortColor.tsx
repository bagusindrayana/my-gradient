import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownToDot, Blend, DownloadIcon, Eclipse, SunMoon, Palette, Droplet, Flame, SwatchBook, Dice5Icon } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
interface DownloadSize {
    width: number;
    height: number;
}

interface SortColorProps {
    sortBy: string;
    setSortBy: (sort: string) => void;
    colorCount: number;
    setColorCount: (count: number) => void;
    generateAgain: () => void;
}

function SortColor({
    sortBy,
    setSortBy,
    colorCount,
    setColorCount,
    generateAgain
}: SortColorProps) {
    return (
        <Card className="te-card p-1">
            <CardContent className="p-1 gap-1">
                <h2 className="te-heading">GENERATE</h2>
                <div className="flex flex-col gap-4 w-full">

                    <div className="flex flex-col gap-2">
                        <Label className="te-label block mb-1">SORT BY :</Label>
                        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                            <Button
                                variant="outline"
                                title='Default'
                                className={`magnetic-target cursor-none aspect-square p-0 ${sortBy === 'default' ? 'bg-black text-white' : 'bg-gray-100'}`}
                                onClick={() => setSortBy('default')}
                            >
                                <ArrowDownToDot className="rotate-180 h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                title='Dark To Light'
                                className={`magnetic-target cursor-none aspect-square p-0 ${sortBy === 'darkness' ? 'bg-black text-white' : 'bg-gray-100'}`}
                                onClick={() => setSortBy('darkness')}
                            >
                                <Eclipse className="rotate-180 h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                title='Light To Dark'
                                className={`magnetic-target cursor-none aspect-square p-0 ${sortBy === 'lightness' ? 'bg-black text-white' : 'bg-gray-100'}`}
                                onClick={() => setSortBy('lightness')}
                            >
                                <SunMoon className="rotate-180 h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                title='Saturation'
                                className={`magnetic-target cursor-none aspect-square p-0 ${sortBy === 'saturation' ? 'bg-black text-white' : 'bg-gray-100'}`}
                                onClick={() => setSortBy('saturation')}
                            >
                                <Blend className="rotate-180 h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                title='Dominant'
                                className={`magnetic-target cursor-none aspect-square p-0 ${sortBy === 'dominant' ? 'bg-black text-white' : 'bg-gray-100'}`}
                                onClick={() => setSortBy('dominant')}
                            >
                                <Palette className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                title='Soft'
                                className={`magnetic-target cursor-none aspect-square p-0 ${sortBy === 'soft' ? 'bg-black text-white' : 'bg-gray-100'}`}
                                onClick={() => setSortBy('soft')}
                            >
                                <Droplet className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                title='Warm'
                                className={`magnetic-target cursor-none aspect-square p-0 ${sortBy === 'warm' ? 'bg-black text-white' : 'bg-gray-100'}`}
                                onClick={() => setSortBy('warm')}
                            >
                                <Flame className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                title='Pastel'
                                className={`magnetic-target cursor-none aspect-square p-0 ${sortBy === 'pastel' ? 'bg-black text-white' : 'bg-gray-100'}`}
                                onClick={() => setSortBy('pastel')}
                            >
                                <SwatchBook className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 magnetic-target cursor-none">
                        <Label htmlFor="showGradientStops" className="te-label">Colors : {colorCount}</Label>
                        <Slider
                            value={[colorCount]}
                            min={2}
                            max={12}
                            step={1}
                            onValueChange={(val) => setColorCount(val[0])}
                            className="te-slider-track"
                        />
                    </div>
                    <div className='magnetic-target cursor-none w-full'>
                        <Button className="w-full te-button flex items-center justify-center gap-2" disabled={sortBy == "default"} onClick={generateAgain}>
                            <Dice5Icon className="h-4 w-4" />
                            GENERATE
                        </Button>
                    </div>


                </div>
            </CardContent>
        </Card>
    );
}

export default SortColor;
