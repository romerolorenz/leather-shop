-- Adds a separate display handle for the Contact Us page's Instagram link,
-- alongside the existing contact_instagram_url (0006_faq_and_contact.sql).
-- The URL is used for the link href; the handle is what's shown as text,
-- so the page can read "@yourshop" instead of the literal word "Instagram".

insert into settings (key, value) values
  ('contact_instagram_handle', '"@yourshop"');
