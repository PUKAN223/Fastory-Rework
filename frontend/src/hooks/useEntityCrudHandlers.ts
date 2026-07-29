import { useCallback } from "react";
import { toast } from "sonner";

type CrudMessages = {
  createSuccess?: string;
  updateSuccess?: string;
  deleteSuccess?: string;
};

type UseEntityCrudHandlersOptions<CreatePayload, UpdatePayload> = {
  createAction: (payload: CreatePayload) => Promise<void>;
  updateAction: (id: string, payload: UpdatePayload) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
  messages?: CrudMessages;
};

export function useEntityCrudHandlers<CreatePayload, UpdatePayload>({
  createAction,
  updateAction,
  deleteAction,
  messages,
}: UseEntityCrudHandlersOptions<CreatePayload, UpdatePayload>) {
  const handleCreate = useCallback(
    async (payload: CreatePayload) => {
      try {
        await createAction(payload);
        if (messages?.createSuccess) toast.success(messages.createSuccess);
        return true;
      } catch {
        return false;
      }
    },
    [createAction, messages?.createSuccess],
  );

  const handleUpdate = useCallback(
    async (id: string, payload: UpdatePayload) => {
      try {
        await updateAction(id, payload);
        if (messages?.updateSuccess) toast.success(messages.updateSuccess);
        return true;
      } catch {
        return false;
      }
    },
    [messages?.updateSuccess, updateAction],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteAction(id);
        if (messages?.deleteSuccess) toast.success(messages.deleteSuccess);
        return true;
      } catch {
        return false;
      }
    },
    [deleteAction, messages?.deleteSuccess],
  );

  return {
    handleCreate,
    handleUpdate,
    handleDelete,
  };
}
