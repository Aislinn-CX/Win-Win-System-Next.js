CREATE TABLE "audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"field_name" varchar(100) NOT NULL,
	"old_value" text,
	"new_value" text,
	"changed_by" varchar(100) DEFAULT 'system' NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "contract_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"contract_no" varchar(50) NOT NULL,
	"customer_name" varchar(200) NOT NULL,
	"customer_country" varchar(100) NOT NULL,
	"payment_type" varchar(10) NOT NULL,
	"status" varchar(20) DEFAULT '进行中' NOT NULL,
	"completed_at" date,
	"remark" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contract_contract_no_unique" UNIQUE("contract_no")
);
--> statement-breakpoint
CREATE TABLE "contract_item" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "contract_item_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"contract_id" integer NOT NULL,
	"item_no" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"order_qty" numeric(12, 2) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"cbm" numeric(10, 4),
	"original_factory_date" date NOT NULL,
	"current_factory_date" date,
	"factory_actual_done_date" date,
	"factory_status" varchar(20) DEFAULT '正常',
	"inspection_result" varchar(10) DEFAULT '未验货',
	"planned_etd" date,
	"actual_etd" date,
	"cutoff_default_date" date,
	"cutoff_confirmed_date" date,
	"booking_status" varchar(50),
	"loading_date" date,
	"docs_sent_status" boolean DEFAULT false,
	"docs_sent_date" date,
	"expected_payment_date" date,
	"actual_payment_date" date,
	"telex_release_status" boolean DEFAULT false,
	"telex_release_date" date,
	"shipment_status" varchar(10) DEFAULT '未出运',
	"item_status" varchar(10) DEFAULT '进行中',
	"remark" text
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "customer_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(200) NOT NULL,
	"country" varchar(100),
	"contact_info" jsonb,
	"remark" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factory_date_change_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "factory_date_change_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"contract_item_id" integer NOT NULL,
	"old_date" date NOT NULL,
	"new_date" date NOT NULL,
	"change_reason" varchar(500),
	"remark" text,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_record" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "inspection_record_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"contract_item_id" integer NOT NULL,
	"inspection_date" date NOT NULL,
	"result" varchar(10) NOT NULL,
	"fail_reason" text,
	"retest_decision" varchar(10),
	"retest_date" date,
	"handling_method" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "quote_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"quote_no" varchar(50) NOT NULL,
	"customer_name" varchar(200) NOT NULL,
	"status" varchar(20) DEFAULT '草稿自查中' NOT NULL,
	"remark" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quote_quote_no_unique" UNIQUE("quote_no")
);
--> statement-breakpoint
CREATE TABLE "quote_en_desc_suggestion" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "quote_en_desc_suggestion_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"quote_item_id" integer NOT NULL,
	"suggested_text" text NOT NULL,
	"generation_basis" text,
	"confirm_status" varchar(10) DEFAULT '待确认' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_feedback_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "quote_feedback_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"quote_id" integer NOT NULL,
	"feedback_note" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_image_candidate" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "quote_image_candidate_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"quote_item_id" integer NOT NULL,
	"image_url" text NOT NULL,
	"source" varchar(200) NOT NULL,
	"confirm_status" varchar(10) DEFAULT '待确认' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_item" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "quote_item_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"quote_id" integer NOT NULL,
	"item_no" varchar(50) NOT NULL,
	"description_cn" text NOT NULL,
	"description_en_confirmed" text,
	"length" numeric(10, 3),
	"width" numeric(10, 3),
	"height" numeric(10, 3),
	"net_weight" numeric(10, 3),
	"gross_weight" numeric(10, 3),
	"cbm" numeric(10, 4),
	"check_flags" jsonb
);
--> statement-breakpoint
CREATE TABLE "shipment_payment_record" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shipment_payment_record_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"contract_item_id" integer NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"event_date" date NOT NULL,
	"remark" text
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "task_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"task_type" varchar(50) NOT NULL,
	"contract_id" integer NOT NULL,
	"contract_item_id" integer,
	"related_business_date" date,
	"planned_remind_date" date,
	"next_remind_date" date,
	"completed_at" date,
	"status" varchar(20) DEFAULT '待提醒' NOT NULL,
	"remark" text,
	"merge_group_key" varchar(200),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contract_item" ADD CONSTRAINT "contract_item_contract_id_contract_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contract"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_date_change_log" ADD CONSTRAINT "factory_date_change_log_contract_item_id_contract_item_id_fk" FOREIGN KEY ("contract_item_id") REFERENCES "public"."contract_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_record" ADD CONSTRAINT "inspection_record_contract_item_id_contract_item_id_fk" FOREIGN KEY ("contract_item_id") REFERENCES "public"."contract_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_en_desc_suggestion" ADD CONSTRAINT "quote_en_desc_suggestion_quote_item_id_quote_item_id_fk" FOREIGN KEY ("quote_item_id") REFERENCES "public"."quote_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_feedback_log" ADD CONSTRAINT "quote_feedback_log_quote_id_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quote"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_image_candidate" ADD CONSTRAINT "quote_image_candidate_quote_item_id_quote_item_id_fk" FOREIGN KEY ("quote_item_id") REFERENCES "public"."quote_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_item" ADD CONSTRAINT "quote_item_quote_id_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quote"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_payment_record" ADD CONSTRAINT "shipment_payment_record_contract_item_id_contract_item_id_fk" FOREIGN KEY ("contract_item_id") REFERENCES "public"."contract_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_contract_id_contract_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contract"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_contract_item_id_contract_item_id_fk" FOREIGN KEY ("contract_item_id") REFERENCES "public"."contract_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ============================================================
-- updated_at 自动维护触发器（手动补充，Drizzle 不生成）
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER trg_contract_updated_at
  BEFORE UPDATE ON contract
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint
CREATE TRIGGER trg_customer_updated_at
  BEFORE UPDATE ON customer
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint
CREATE TRIGGER trg_quote_updated_at
  BEFORE UPDATE ON quote
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint
CREATE TRIGGER trg_task_updated_at
  BEFORE UPDATE ON task
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();