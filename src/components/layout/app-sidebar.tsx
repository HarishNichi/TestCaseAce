'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileCode, ImageIcon } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Icons } from '@/components/icons';

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 font-headline">
          <Icons.logo className="h-8 w-8 text-primary" />
          <span className="text-lg font-semibold">Test Case Ace</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/'}
              tooltip="UI Test Generation"
            >
              <Link href="/">
                <ImageIcon />
                <span className="font-body">UI Test Generation</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/api-testing'}
              tooltip="API Test Generation"
            >
              <Link href="/api-testing">
                <FileCode />
                <span className="font-body">API Test Generation</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
