'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import clsx from 'clsx';

interface SelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface SelectMenuProps<T extends string> {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  label?: string;
  variant?: 'default' | 'minimal' | 'ghost';
  size?: 'sm' | 'md';
  align?: 'start' | 'center' | 'end';
}

/**
 * SelectMenu - Pro Custom Dropdown
 *
 * Replaces native <select> with a cinematic popover.
 * Three variants:
 * - default: Bordered button with background
 * - minimal: Just text and chevron (Linear-style)
 * - ghost: Transparent background, border on hover
 *
 * @example
 * <SelectMenu
 *   options={[
 *     { value: 'flux', label: 'FLUX.1 Dev', description: '12B params' },
 *     { value: 'sdxl', label: 'SDXL', description: '6.6B params' },
 *   ]}
 *   value={model}
 *   onChange={setModel}
 *   variant="minimal"
 * />
 */
export function SelectMenu<T extends string>({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  variant = 'default',
  size = 'sm',
  align = 'start',
}: SelectMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  const triggerStyles = {
    default: 'bg-zinc-900/60 border border-white/5 hover:border-white/10',
    minimal: 'bg-transparent hover:bg-white/5',
    ghost: 'bg-transparent border border-transparent hover:border-white/10',
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
          {label}
        </label>
      )}

      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            className={clsx(
              'flex items-center gap-2 rounded-lg transition-all',
              triggerStyles[variant],
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
            )}
          >
            {selectedOption?.icon}
            <span className={clsx(selectedOption ? 'text-white' : 'text-zinc-500')}>
              {selectedOption?.label || placeholder}
            </span>
            <ChevronDown
              size={12}
              className={clsx(
                'text-zinc-500 transition-transform ml-1',
                open && 'rotate-180'
              )}
            />
          </button>
        </Popover.Trigger>

        <AnimatePresence>
          {open && (
            <Popover.Portal forceMount>
              <Popover.Content
                asChild
                sideOffset={4}
                align={align}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="z-50 min-w-[160px] rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl p-1 shadow-2xl shadow-black/50"
                >
                  {options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={clsx(
                        'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                        option.value === value
                          ? 'bg-violet-500/10 text-white'
                          : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      {option.icon && (
                        <span className="text-zinc-500">{option.icon}</span>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">
                          {option.label}
                        </div>
                        {option.description && (
                          <div className="text-[10px] text-zinc-500 truncate">
                            {option.description}
                          </div>
                        )}
                      </div>

                      {option.value === value && (
                        <Check size={14} className="text-violet-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </motion.div>
              </Popover.Content>
            </Popover.Portal>
          )}
        </AnimatePresence>
      </Popover.Root>
    </div>
  );
}

export default SelectMenu;
