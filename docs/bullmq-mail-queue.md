# BullMQ Mail Queue

BullMQ provides a Redis-backed job queue for asynchronous email delivery.

## Overview

Mail jobs are enqueued to Redis and processed by a worker without blocking the HTTP response.

```
API Request
   ↓
Enqueue Job to Redis
   ↓
Return Response Immediately
   ↓
Worker Processes Job
   ↓
Send Email via SMTP
```

## Implementation

```typescript
@Injectable()
export class MailService {
  private mailQueue: Queue;

  constructor(private bullModule: BullModule) {
    this.mailQueue = this.bullModule.getQueue('mail');
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.mailQueue.add(
      'welcome',
      { email, name },
      { delay: 0, attempts: 3 }
    );
  }

  async sendOrderConfirmation(orderId: string, email: string): Promise<void> {
    await this.mailQueue.add(
      'order-confirmation',
      { orderId, email },
      { delay: 1000, attempts: 5, backoff: { type: 'exponential', delay: 2000 } }
    );
  }
}

// Mail Processor
@Processor('mail')
export class MailProcessor {
  constructor(private mailerService: MailerService) {}

  @Process('welcome')
  async handleWelcomeEmail(job: Job<{ email: string; name: string }>) {
    const { email, name } = job.data;
    await this.mailerService.send({
      to: email,
      subject: 'Welcome to PBR Hut',
      template: 'welcome',
      context: { name }
    });
  }

  @Process('order-confirmation')
  async handleOrderConfirmation(job: Job<{ orderId: string; email: string }>) {
    const { orderId, email } = job.data;
    const order = await this.orderRepository.findById(orderId);
    await this.mailerService.send({
      to: email,
      subject: `Order #${orderId} Confirmed`,
      template: 'order-confirmation',
      context: { order }
    });
  }

  @OnError()
  async onError(error: Error, job: Job) {
    console.error(`Job ${job.id} failed:`, error);
  }

  @OnCompleted()
  async onCompleted(result: any, job: Job) {
    console.log(`Job ${job.id} completed`);
  }
}
```

## Job Lifecycle

```
Enqueued
   ↓
Waiting
   ↓
Active
   ↓
Completed ✓
or
Failed → Retry
   ↓
Completed ✓
```

## Configuration

```typescript
@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379
      }
    }),
    BullModule.registerQueue({ name: 'mail' })
  ],
  providers: [MailService, MailProcessor]
})
export class MailModule {}
```

## Bull Board Dashboard

Monitor jobs visually:

```
http://localhost:3000/queues
```

Shows:
- Pending jobs
- Active jobs
- Completed jobs
- Failed jobs

## Retry Logic

```typescript
await this.mailQueue.add(
  'order-confirmation',
  { orderId, email },
  {
    attempts: 5,              // Retry up to 5 times
    backoff: {
      type: 'exponential',
      delay: 2000             // Initial delay 2s, doubles each retry
    }
  }
);
```

## Error Handling

```typescript
@OnError()
async onMailError(error: Error, job: Job) {
  // Log error
  // Send alert to admin
  // Move to DLQ if needed
}
```

## Email Templates

Use Handlebars templates:

```hbs
{{!-- templates/order-confirmation.hbs --}}
<h1>Order Confirmed</h1>
<p>Hello {{name}},</p>
<p>Your order #{{orderId}} has been confirmed.</p>
<p>Items:</p>
<ul>
  {{#each items}}
    <li>{{this.name}} x{{this.quantity}}</li>
  {{/each}}
</ul>
```

## Best Practices

1. **Use exponential backoff** - Retry with increasing delays
2. **Set reasonable TTL** - Don't retry forever
3. **Log failures** - For debugging
4. **Use templates** - For consistency
5. **Test email** - Before production
6. **Monitor queue health** - Watch for backlog
7. **Handle duplicates** - Set concurrency limits

## Environment Variables

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=noreply@pbrhut.com
MAIL_PASSWORD=app-specific-password
MAIL_FROM_NAME=PBR Hut
```
