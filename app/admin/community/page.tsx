'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IconFlag, IconMessage, IconUsers } from '@tabler/icons-react'
import { PostsTab } from './posts-tab'
import { ReportsTab } from './reports-tab'
import { MembersTab } from './members-tab'

export default function CommunityAdminPage() {
  const [tab, setTab] = useState('reports')

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Community</h1>
        <p className="text-sm text-muted-foreground">
          Moderate posts, comments, reports and member standing. Every action here is recorded in the audit log.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="reports" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <IconFlag className="w-4 h-4 mr-1.5" /> Reports
          </TabsTrigger>
          <TabsTrigger value="posts" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <IconMessage className="w-4 h-4 mr-1.5" /> Posts
          </TabsTrigger>
          <TabsTrigger value="members" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <IconUsers className="w-4 h-4 mr-1.5" /> Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4"><ReportsTab /></TabsContent>
        <TabsContent value="posts" className="mt-4"><PostsTab /></TabsContent>
        <TabsContent value="members" className="mt-4"><MembersTab /></TabsContent>
      </Tabs>
    </div>
  )
}
