import { TooltipContent } from '@radix-ui/react-tooltip'
import CopyButton from 'components/ui/CopyButton'
import { Eye, Loader2, MoreVertical, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  TableCell,
  TableRow,
  TooltipTrigger_Shadcn_,
  Tooltip_Shadcn_,
  cn,
} from 'ui'

import { useParams } from 'common'
import { useAPIKeyDeleteMutation } from 'data/api-keys/api-key-delete-mutation'
import { APIKeysData } from 'data/api-keys/api-keys-query'
import ConfirmModal from 'ui-patterns/Dialogs/ConfirmDialog'
import ConfirmationModal from 'ui-patterns/Dialogs/ConfirmationModal'
import api from 'pages/api/props/project/[ref]/api'
import { motion, AnimatePresence } from 'framer-motion'
import { useCheckPermissions } from 'hooks/misc/useCheckPermissions'

import { PermissionAction } from '@supabase/shared-types/out/constants'
import { useAPIKeyIdQuery } from 'data/api-keys/[id]/api-key-id-query'
import { QueryClient, useQueryClient } from '@tanstack/react-query'
import { apiKeysKeys } from 'data/api-keys/keys'
import { InputVariants } from '@ui/components/shadcn/ui/input'
import { toast } from 'sonner'
import APIKeyDeleteDialog from './APIKeyDeleteDialog'

const APIKeyRow = ({ apiKey }: { apiKey: APIKeysData[0] }) => {
  const isSecret = apiKey.type === 'secret'

  const MotionTableRow = motion(TableRow)

  return (
    <MotionTableRow
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 50,
        mass: 1,
      }}
    >
      <TableCell className="py-2">{apiKey.description || '/'}</TableCell>
      <TableCell className="py-2">
        <div className="flex flex-row gap-2">
          {/* <Input_Shadcn_ apiKey={apiKey} /> */}
          <Input apiKey={apiKey} />
        </div>
      </TableCell>

      <TableCell className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger className="px-1 focus-visible:outline-none" asChild>
            <Button
              type="text"
              size="tiny"
              icon={
                <MoreVertical size="14" className="text-foreground-light hover:text-foreground" />
              }
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-w-40" align="end">
            {/* <Tooltip_Shadcn_>
              <TooltipTrigger_Shadcn_ asChild>
                <DropdownMenuItem
                  className="flex gap-2 !pointer-events-auto"
                  onClick={async (e) => {
                    if (canDeleteAPIKeys) {
                      setDeleteDialogOpenState(true)
                    }
                  }}
                >
                  {isDeletingAPIKey ? (
                    <Loader2 size="12" className="animate-spin" />
                  ) : (
                    <TrashIcon size="12" />
                  )}
                  {isDeletingAPIKey ? 'Deleting key..' : 'Delete API key'}
                </DropdownMenuItem>
              </TooltipTrigger_Shadcn_>
              {!canDeleteAPIKeys && (
                <TooltipContent side="left">
                  You need additional permissions to delete API keys
                </TooltipContent>
              )}
            </Tooltip_Shadcn_> */}
            <APIKeyDeleteDialog apiKey={apiKey} />
            <DropdownMenuSeparator />
            <APIKeyDeleteDialog apiKey={apiKey} />
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </MotionTableRow>
  )
}

function Input({ apiKey }: { apiKey: APIKeysData[0] }) {
  // const [shown, setShown] = useState(false)
  const [show, setShowState] = useState(false)
  const { ref: projectRef } = useParams()
  const canReadAPIKeys = useCheckPermissions(PermissionAction.TENANT_SQL_ADMIN_WRITE, '*')
  const queryClient = useQueryClient()

  const {
    data,
    isLoading: isLoadingApiKey,
    error,
    refetch: refetchApiKey,
  } = useAPIKeyIdQuery(
    {
      projectRef,
      id: apiKey.id as string,
    },
    {
      enabled: show,
      staleTime: 0, // Data is considered stale immediately
      cacheTime: 0, // Cache is cleared immediately after query becomes stale
    }
  )

  async function onSubmitShow() {
    setShowState(true)
    // Set a timeout to invalidate the cache after a certain amount of time
    setTimeout(() => {
      setShowState(false)
      queryClient.removeQueries({
        queryKey: apiKeysKeys.single(projectRef, apiKey.id as string),
        exact: true,
      })
    }, 10000) // Destroy query after 10 seconds
  }

  async function onCopy() {
    // if ID already exists from a reveal action, return that
    // @ts-expect-error / TODO: fix type error
    if (data?.api_key) return data?.api_key

    try {
      // fetch ID and then destroy query immediately
      const result = await refetchApiKey()
      queryClient.removeQueries({
        queryKey: apiKeysKeys.single(projectRef, apiKey.id as string),
        exact: true,
      })

      if (result.isSuccess) return result.data.api_key

      if (error) {
        toast.error('Failed to copy secret API key')
      }
    } catch (error) {
      console.error('Failed to fetch API key:', error)
    }

    return apiKey.api_key // Fallback to the masked version
  }

  const isSecret = apiKey.type === 'secret'

  return (
    <>
      <div
        className={cn(
          InputVariants({ size: 'tiny' }),
          'flex-1 grow gap-0 font-mono rounded-full max-w-60 overflow-hidden',
          show ? 'ring-1 ring-foreground-lighter ring-opacity-50' : 'ring-0 ring-opacity-0',
          'transition-all'
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={show ? 'shown' : 'hidden'}
            initial={{ opacity: 0, y: show ? 16 : -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: show ? 16 : -16 }}
            transition={{
              duration: 0.12,
              y: { type: 'spring', stiffness: 2450, damping: 55 },
            }}
            className="truncate"
          >
            {show
              ? // @ts-expect-error / TODO: fix type error
                data?.api_key
              : apiKey?.api_key}
          </motion.span>
        </AnimatePresence>
      </div>
      {isSecret && (
        <AnimatePresence>
          {!show && (
            <motion.div
              initial={{ opacity: 0, scale: 1, width: 0 }}
              animate={{ opacity: 1, scale: 1, width: 'auto' }}
              exit={{ opacity: 0, scale: 1, width: 0 }}
              transition={{ duration: 0.12 }}
              style={{ overflow: 'hidden' }}
            >
              <Button
                type="outline"
                className="rounded-full px-2"
                icon={<Eye strokeWidth={2} />}
                onClick={onSubmitShow}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}
      <CopyButton type="default" asyncText={onCopy} iconOnly className="rounded-full px-2" />
    </>
  )
}

export default APIKeyRow
