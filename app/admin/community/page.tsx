'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { IconArticle, IconFlag, IconUsers } from '@tabler/icons-react'
import { useAdminReports } from '@/hooks/use-community'
import { PostsTab } from './posts-tab'
import { ReportsTab } from './reports-tab'
import { UsersTab } from './users-tab'

export default function CommunityModerationPage() {
  // Only for the queue count on the tab — ReportsTab shares this cache entry.
  const { data: reports = [] } = useAdminReports()

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-3xl font-bold tracking-tight">Community</h2>
        <p className="text-muted-foreground">
          Moderate posts, comments, reports and member standing. Every action here is recorded in the audit log.
        </p>
      </div>

      <Tabs defaultValue="reports">
        <TabsList className="bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="reports" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <IconFlag className="w-4 h-4 mr-2" />
            Reports
            {reports.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 text-xs h-5 px-1.5 inline-flex items-center justify-center font-medium bg-destructive/10 text-destructive"
              >
                {reports.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="posts" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <IconArticle className="w-4 h-4 mr-2" /> Posts
          </TabsTrigger>
          <TabsTrigger value="members" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <IconUsers className="w-4 h-4 mr-2" /> Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4">
          <ReportsTab />
        </TabsContent>
        <TabsContent value="posts" className="mt-4">
          <PostsTab />
        </TabsContent>
        <TabsContent value="members" className="mt-4">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
