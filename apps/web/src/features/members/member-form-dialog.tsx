'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PHONE_REGEX, UserRole, type MemberDto } from '@community-finance/shared';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateMember, useUpdateMember } from './api';

/**
 * Local form schema (no .default() so RHF input/output types match).
 * Password is optional here — required on create, ignored on edit.
 */
const formSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(100),
  phone: z.string().trim().regex(PHONE_REGEX, 'Enter a valid 10-digit mobile number'),
  password: z.string().optional(),
  role: z.enum([UserRole.ADMIN, UserRole.MEMBER]),
  address: z.string().trim().max(500).optional(),
  familyGroup: z.string().trim().max(100).optional(),
  aadhaar: z
    .string()
    .regex(/^\d{12}$/, 'Aadhaar must be 12 digits')
    .optional()
    .or(z.literal('')),
});
type FormValues = z.infer<typeof formSchema>;

export function MemberFormDialog({
  open,
  onOpenChange,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present ⇒ edit mode. */
  member?: MemberDto | null;
}) {
  const { user } = useAuth();
  const isEdit = Boolean(member);
  const createMutation = useCreateMember();
  const updateMutation = useUpdateMember(member?.id ?? '');
  const pending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      password: '',
      role: UserRole.MEMBER,
      address: '',
      aadhaar: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: member?.name ?? '',
        phone: member?.phone ?? '',
        password: '',
        role: (member?.role as UserRole.ADMIN | UserRole.MEMBER) ?? UserRole.MEMBER,
        address: member?.address ?? '',
        familyGroup: member?.familyGroup ?? '',
        aadhaar: '',
      });
    }
  }, [open, member, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      phone: values.phone,
      role: values.role,
      address: values.address || undefined,
      familyGroup: values.familyGroup || undefined,
      aadhaar: values.aadhaar || undefined,
    };
    if (isEdit && member) {
      await updateMutation.mutateAsync(payload);
    } else {
      if (!values.password || values.password.length < 8) {
        form.setError('password', {
          message: 'Initial password of at least 8 characters is required',
        });
        return;
      }
      await createMutation.mutateAsync({ ...payload, family: [], password: values.password });
    }
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit member' : 'Add member'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the member details below.'
              : 'The member logs in with their phone number and the initial password you set.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="m-name">Full name</Label>
              <Input id="m-name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-phone">Mobile number</Label>
              <Input id="m-phone" inputMode="numeric" maxLength={10} {...form.register('phone')} />
              {form.formState.errors.phone && (
                <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>
          </div>

          {!isEdit && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="m-password">Initial password</Label>
                <Input id="m-password" type="text" autoComplete="off" {...form.register('password')} />
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              {user?.role === UserRole.SUPER_ADMIN && (
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={form.watch('role')}
                    onValueChange={(v) => form.setValue('role', v as UserRole.ADMIN | UserRole.MEMBER)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.MEMBER}>Member</SelectItem>
                      <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="m-address">Address</Label>
            <Textarea id="m-address" rows={2} {...form.register('address')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-family">Family / household (optional)</Label>
            <Input
              id="m-family"
              placeholder="e.g. Kumar Family — members sharing this are grouped"
              {...form.register('familyGroup')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-aadhaar">Aadhaar (optional)</Label>
            <Input
              id="m-aadhaar"
              inputMode="numeric"
              maxLength={12}
              placeholder="12-digit number — stored encrypted"
              {...form.register('aadhaar')}
            />
            {form.formState.errors.aadhaar && (
              <p className="text-xs text-destructive">{form.formState.errors.aadhaar.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {isEdit ? 'Save changes' : 'Add member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
