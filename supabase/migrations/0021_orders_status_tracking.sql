-- "Payment details sent" becomes a real step in the order status
-- lifecycle (pending_payment -> payment_details_sent -> paid -> shipped,
-- or cancelled at any point before paid), not a side boolean flag —
-- widens the `orders.status` check constraint to allow the new value.
-- Uses a dynamic lookup for the existing constraint's name rather than
-- hardcoding `orders_status_check`, in case Postgres/an earlier migration
-- named it differently.
do $$
declare
  existing_constraint text;
begin
  select conname into existing_constraint
  from pg_constraint
  where conrelid = 'orders'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%pending_payment%';

  if existing_constraint is not null then
    execute format('alter table orders drop constraint %I', existing_constraint);
  end if;
end $$;

alter table orders add constraint orders_status_check
  check (status in ('pending_payment', 'payment_details_sent', 'paid', 'shipped', 'cancelled'));

-- Single shared timestamp for whichever status-changing action happened
-- most recently on this order (payment details sent, mark paid, mark
-- shipped, cancel) — overwritten each time rather than tracked per
-- status/event. Null for an order that's never had one of those actions
-- applied yet.
alter table orders add column status_updated_at timestamptz;
