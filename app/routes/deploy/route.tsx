import { Form, useActionData } from '@remix-run/react'
import { z } from 'zod'
import {
  FieldConfig,
  conform,
  useFieldList,
  useFieldset,
  useForm,
  list,
} from '@conform-to/react'
import { parse, getFieldsetConstraint } from '@conform-to/zod'
import { Input } from '~/components/ui/input'
import { ActionFunctionArgs, json, redirect } from '@remix-run/node'
import { useRef } from 'react'
import { Button } from '~/components/ui/button'
import { PlusIcon, RocketIcon, XIcon } from 'lucide-react'
import { cn } from '~/lib/utils'
import {
  DeploymentSchema,
  DeploymentServicePortSchema,
  DeploymentServiceSchema,
} from './schema'
import { DeploymentSchemaServer } from './schema.server'
import { createNewDeployment } from '~/lib/deployment.server'

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const submission = await parse(formData, {
    async: true,
    schema: intent =>
      DeploymentSchemaServer.transform(async (values, ctx) => {
        if (intent !== 'submit') {
          return { ...values, deployment: null } as const
        }

        try {
          await createNewDeployment(values)
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Something went wrong while creating your deployment'

          ctx.addIssue({
            code: 'custom',
            message,
            fatal: true,
          })

          return z.NEVER
        }

        return {
          ...values,
          deployment: {
            name: values.name,
          },
        } as const
      }),
  })

  if (submission.intent !== 'submit') {
    return json({ status: 'idle', submission })
  }

  if (!submission.value?.deployment) {
    return json({ status: 'error', submission }, { status: 400, statusText: 'Bad Request' })
  }

  return redirect(`/stacks/${submission.value.deployment.name}`)
}

export default function DeployRoute() {
  const actionData = useActionData<typeof action>()

  const [form, fields] = useForm({
    id: 'deployment-form',
    constraint: getFieldsetConstraint(DeploymentSchema),
    lastSubmission: actionData?.submission,
    defaultValue: {
      services: [
        {
          name: '',
          image: '',
        },
      ],
    },
    onValidate: ({ formData }) => {
      return parse(formData, {
        schema: DeploymentSchema,
      })
    },
    shouldRevalidate: 'onBlur',
  })

  const services = useFieldList(form.ref, fields.services)

  return (
    <div className="h-full min-w-0 overflow-y-auto">
      <div className="container p-6">
        <h2 className="text-2xl font-medium">Create new deployment</h2>

        <Form className="mt-6" method="POST" {...form.props}>
          {/**
           * Make sure we perform default form submission on enter key press
           * Browser selects the first submit button in the form by default
           */}
          <input type="submit" hidden />

          <section>
            <h3 className="text-lg font-medium">General</h3>
            <p className="text-muted-foreground">Basic information about your deployment</p>
            <div className="mt-4 space-y-2">
              <div>
                <label htmlFor={fields.name.id}>Name</label>
                <Input className="mt-1" autoComplete="off" {...conform.input(fields.name)} />
                {fields.name.error ? (
                  <p className="mt-0.5 text-sm text-destructive" id={fields.name.errorId}>
                    {fields.name.error}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="mt-6">
            <h3 className="text-lg font-medium">Services</h3>
            <p className="text-muted-foreground">Add services to your deployment</p>
            {fields.services.error ? (
              <p className="mt-0.5 text-sm text-destructive" id={fields.services.errorId}>
                {fields.services.error}
              </p>
            ) : null}
            <ul className="mt-4 space-y-2">
              {services.map((service, index) => {
                return (
                  <li key={service.key} className="flex gap-x-4">
                    <ServiceFieldset formRef={form.ref} config={service} className="grow" />
                    <Button
                      className="mt-7 shrink-0"
                      size="icon"
                      variant="destructive"
                      {...list.remove(fields.services.name, { index })}
                    >
                      <XIcon />
                    </Button>
                  </li>
                )
              })}
            </ul>
            <div className="mt-4 flex justify-end">
              <Button size="icon" variant="outline" {...list.insert(fields.services.name)}>
                <PlusIcon />
              </Button>
            </div>
          </section>

          <div className="mt-6 flex flex-col items-end gap-y-2">
            {form.error ? (
              <p className="text-sm text-destructive" id={form.errorId}>
                {form.error}
              </p>
            ) : null}
            <Button className="gap-x-1.5">
              <RocketIcon className="h-[1.2em] w-[1.2em]" />
              <span>Create Deployment</span>
            </Button>
          </div>
        </Form>
      </div>
    </div>
  )
}

function ServiceFieldset({
  config,
  className,
  formRef,
}: {
  config: FieldConfig<z.infer<typeof DeploymentServiceSchema>>
  className?: string
  formRef: React.RefObject<HTMLFormElement>
}) {
  const fieldsetRef = useRef<HTMLFieldSetElement>(null)
  const fields = useFieldset(fieldsetRef, config)

  const ports = useFieldList(formRef, fields.ports)

  return (
    <div className={cn('flex flex-col gap-y-4', className)}>
      <fieldset
        ref={fieldsetRef}
        className={cn('grid gap-4 sm:grid-cols-2')}
        {...conform.fieldset(config)}
      >
        <div>
          <label htmlFor={fields.name.id}>Name</label>
          <Input className="mt-1" autoComplete="off" {...conform.input(fields.name)} />
          {fields.name.error ? (
            <p className="mt-0.5 text-sm text-destructive" id={fields.name.errorId}>
              {fields.name.error}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor={fields.image.id}>Image</label>
          <Input className="mt-1" autoComplete="off" {...conform.input(fields.image)} />
          {fields.image.error ? (
            <p className="mt-0.5 text-sm text-destructive" id={fields.image.errorId}>
              {fields.image.error}
            </p>
          ) : null}
        </div>
      </fieldset>
      <div>
        <h4 className="font-medium">Ports</h4>
        <p className="text-sm text-muted-foreground">Expose ports for your service</p>
        <ul className="mt-4 space-y-2">
          {ports.map((port, index) => {
            return (
              <li key={port.key} className="flex gap-x-4">
                <ServicePortsFieldset config={port} className="grow" />
                <Button
                  className="mt-7 shrink-0"
                  size="icon"
                  variant="destructive"
                  {...list.remove(fields.ports.name, { index })}
                >
                  <XIcon />
                </Button>
              </li>
            )
          })}
        </ul>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="icon" {...list.insert(fields.ports.name)}>
            <PlusIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}

function ServicePortsFieldset({
  config,
  className,
}: {
  config: FieldConfig<z.infer<typeof DeploymentServicePortSchema>>
  className?: string
}) {
  const ref = useRef<HTMLFieldSetElement>(null)
  const fields = useFieldset(ref, config)

  return (
    <fieldset
      ref={ref}
      className={cn('grid gap-4 sm:grid-cols-2', className)}
      {...conform.fieldset(config)}
    >
      <div>
        <label htmlFor={fields.published.id}>Published</label>
        <Input
          className="mt-1"
          autoComplete="off"
          {...conform.input(fields.published, {
            type: 'number',
          })}
        />
        {fields.published.error ? (
          <p className="mt-0.5 text-sm text-destructive" id={fields.published.errorId}>
            {fields.published.error}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor={fields.target.id}>Target</label>
        <Input
          className="mt-1"
          autoComplete="off"
          {...conform.input(fields.target, {
            type: 'number',
          })}
        />
        {fields.target.error ? (
          <p className="mt-0.5 text-sm text-destructive" id={fields.target.errorId}>
            {fields.target.error}
          </p>
        ) : null}
      </div>
    </fieldset>
  )
}
