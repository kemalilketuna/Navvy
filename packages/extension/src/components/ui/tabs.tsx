import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as React from 'react'

import { cn } from '@/lib/utils'

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
	return (
		<TabsPrimitive.Root
			data-slot="tabs"
			className={cn('flex flex-col gap-2 data-[orientation=vertical]:flex-row', className)}
			{...props}
		/>
	)
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			className={cn(
				'inline-flex items-center justify-start rounded-md text-muted-foreground',
				'data-[orientation=horizontal]:bg-muted data-[orientation=horizontal]:h-9 data-[orientation=horizontal]:p-[3px]',
				'data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[orientation=vertical]:gap-1',
				className
			)}
			{...props}
		/>
	)
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
	return (
		<TabsPrimitive.Trigger
			data-slot="tabs-trigger"
			className={cn(
				"inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:size-4 [&_svg]:shrink-0",
				'data-[orientation=horizontal]:h-[calc(100%-1px)] data-[orientation=horizontal]:px-3 data-[orientation=horizontal]:py-1 data-[orientation=horizontal]:justify-center data-[orientation=horizontal]:flex-1',
				'data-[orientation=vertical]:justify-start data-[orientation=vertical]:px-3 data-[orientation=vertical]:py-2 data-[orientation=vertical]:text-left',
				'hover:bg-accent/50 hover:text-foreground',
				'data-[state=active]:bg-accent data-[state=active]:text-foreground data-[state=active]:shadow-sm',
				className
			)}
			{...props}
		/>
	)
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
	return (
		<TabsPrimitive.Content
			data-slot="tabs-content"
			className={cn('flex-1 outline-none', className)}
			{...props}
		/>
	)
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
