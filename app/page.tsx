'use client'

import { useState } from 'react'
import { BottomNav, type Screen } from '@/components/bottom-nav'
import { WorkoutScreen } from '@/components/workout-screen'
import { HistoryScreen } from '@/components/history-screen'
import { EditWorkoutScreen } from '@/components/edit-workout-screen'
import { AnalyticsScreen } from '@/components/analytics-screen'
import { RoutinesScreen } from '@/components/routines-screen'
import { AuthScreen } from '@/components/auth-screen'
import { UserMenu } from '@/components/user-menu'
import { DataErrorBanner } from '@/components/data-error-banner'
import { useSession } from '@/lib/auth'

export default function Page() {
  const [screen, setScreen] = useState<Screen>('workout')
  const [editWorkoutId, setEditWorkoutId] = useState<string | null>(null)
  const { session, loading } = useSession()

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-0 sm:p-6">
      <div className="relative flex h-svh w-full max-w-md flex-col overflow-hidden bg-background sm:h-[860px] sm:rounded-[2.5rem] sm:border sm:border-border sm:shadow-2xl sm:shadow-black/50">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div
              className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
              aria-label="Loading"
            />
          </div>
        ) : !session ? (
          <AuthScreen />
        ) : (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-card/60 px-4 py-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">
                Ligera
              </span>
              <UserMenu />
            </div>
            <DataErrorBanner />
            <div className="relative flex-1 overflow-hidden">
              {editWorkoutId ? (
                <EditWorkoutScreen
                  workoutId={editWorkoutId}
                  onDone={() => setEditWorkoutId(null)}
                  onClose={() => setEditWorkoutId(null)}
                />
              ) : screen === 'workout' ? (
                <WorkoutScreen onOpenRoutines={() => setScreen('routines')} />
              ) : screen === 'routines' ? (
                <RoutinesScreen />
              ) : screen === 'history' ? (
                <HistoryScreen onEdit={setEditWorkoutId} />
              ) : (
                <AnalyticsScreen />
              )}
            </div>
            <BottomNav
              active={screen}
              onChange={(next) => {
                setEditWorkoutId(null)
                setScreen(next)
              }}
            />
          </>
        )}
      </div>
    </main>
  )
}