"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { startOfTomorrow } from "@/lib/dates";

type DatePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: Date;
  placeholder?: string;
  allowClear?: boolean;
};

export function DatePicker({
  id,
  value,
  onChange,
  minDate = startOfTomorrow(),
  placeholder = "Select a future due date",
  allowClear = true,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => {
    if (!value) return undefined;
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : undefined;
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        id={id}
        type="button"
        variant="outline"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full justify-start text-left font-normal",
          !selected && "text-muted-foreground"
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {selected ? format(selected, "PPP") : placeholder}
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-[100] mt-2 rounded-md border bg-white p-3 shadow-lg">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (!date) {
                onChange("");
                setOpen(false);
                return;
              }
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }}
            disabled={{ before: minDate }}
            defaultMonth={selected ?? minDate}
          />
        </div>
      )}
      {allowClear && value ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1"
          onClick={() => { onChange(""); setOpen(false); }}
        >
          Clear date
        </Button>
      ) : null}
    </div>
  );
}
