import { useNavigate } from "@tanstack/react-router";
import { formatLongDate, getAnalyticsPresets } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, XIcon } from "lucide-react";
import { useState, useEffect } from "react";

export function DateRangePicker({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
}) {
  const navigate = useNavigate();
  const presets = getAnalyticsPresets();
  const [customStart, setCustomStart] = useState(startDate || "");
  const [customEnd, setCustomEnd] = useState(endDate || "");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCustomStart(startDate || "");
      setCustomEnd(endDate || "");
    }
  }, [startDate, endDate, isOpen]);

  const activePreset = presets.find(
    (p) => p.startDate === startDate && p.endDate === endDate
  );

  const isCustom = (startDate || endDate) && !activePreset;

  const handlePresetChange = (label: string) => {
    if (label === "custom") return;
    const preset = presets.find((p) => p.label === label);
    if (preset) {
      navigate({
        to: "/analytics",
        search: { startDate: preset.startDate, endDate: preset.endDate },
      });
    }
  };

  const applyCustomRange = () => {
    if (customStart && customEnd) {
      navigate({
        to: "/analytics",
        search: { startDate: customStart, endDate: customEnd },
      });
      setIsOpen(false);
    }
  };

  const clearRange = () => {
    navigate({ to: "/analytics", search: {} });
    setIsOpen(false);
  };

  let displayLabel = "Select Date Range";
  if (activePreset) {
    displayLabel = activePreset.label;
  } else if (startDate && endDate) {
    displayLabel = `${formatLongDate(startDate)} – ${formatLongDate(endDate)}`;
  } else if (startDate) {
    displayLabel = `From ${formatLongDate(startDate)}`;
  } else if (endDate) {
    displayLabel = `Until ${formatLongDate(endDate)}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        className="w-[180px] bg-background"
        value={activePreset ? activePreset.label : isCustom ? "custom" : ""}
        onChange={(e) => handlePresetChange(e.target.value)}
      >
        <option value="" disabled hidden>Date Range</option>
        {presets.map((p) => (
          <option key={p.label} value={p.label}>
            {p.label}
          </option>
        ))}
        {isCustom && <option value="custom">Custom</option>}
      </NativeSelect>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[240px] justify-start bg-background font-normal">
            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
            <span className="truncate">{displayLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  className="rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  className="rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={clearRange} className="text-muted-foreground">
                Clear
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={applyCustomRange}
                  disabled={!customStart || !customEnd || customStart > customEnd}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {(startDate || endDate) && (
        <Button variant="ghost" size="icon" onClick={clearRange} title="Clear range" className="h-9 w-9 rounded-full text-muted-foreground">
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Clear range</span>
        </Button>
      )}
    </div>
  );
}
