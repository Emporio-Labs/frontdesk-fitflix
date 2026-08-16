export interface ContentFieldDefinition {
  key: string
  label: string
  description: string
  defaultValue: string
  type: 'short-text' | 'long-text' | 'button-label' | 'message'
  placeholder?: string
}

export interface ContentComponentDefinition {
  id: string
  name: string
  surface: 'visitor' | 'landing' | 'other'
  surfaceLabel: string
  description: string
  badge: string
  iconName: 'hero' | 'stream' | 'calendar' | 'barbell' | 'pricing' | 'chat' | 'custom'
  fields: ContentFieldDefinition[]
}

export const APP_COMPONENTS: ContentComponentDefinition[] = [
  {
    id: 'visitor-hero',
    name: 'Visitor Home — Hero Section',
    surface: 'visitor',
    surfaceLabel: 'Visitor Screen',
    description:
      'Top greeting banner and primary conversion buttons displayed to signed-up non-members.',
    badge: 'High Impact',
    iconName: 'hero',
    fields: [
      {
        key: 'visitor.hero.greeting',
        label: 'Greeting Headline',
        description: 'Personalized user welcome at the top of the screen (supports $name parameter).',
        defaultValue: 'Hi $name',
        type: 'short-text',
        placeholder: 'Hi $name',
      },
      {
        key: 'visitor.hero.positioning',
        label: 'Positioning Statement',
        description: 'Core brand value proposition explaining the club concept under the greeting.',
        defaultValue:
          'One club built around your biology — training, recovery and DNA-guided coaching under one roof.',
        type: 'long-text',
        placeholder: 'One club built around your biology...',
      },
      {
        key: 'visitor.hero.cta',
        label: 'Primary Button Label',
        description: 'Filled primary action button leading to membership plans (/plan-renewal).',
        defaultValue: 'See plans',
        type: 'button-label',
        placeholder: 'See plans',
      },
      {
        key: 'visitor.hero.cta.secondary',
        label: 'Secondary Button Label',
        description: 'Outlined action button opening a direct WhatsApp consultation chat.',
        defaultValue: 'Talk to us',
        type: 'button-label',
        placeholder: 'Talk to us',
      },
      {
        key: 'visitor.hero.consult.message',
        label: 'WhatsApp Consultation Prompt',
        description: 'Pre-filled message text sent when tapping the "Talk to us" button.',
        defaultValue: "Hi Fitflix — I'd like to know more about membership.",
        type: 'message',
        placeholder: "Hi Fitflix — I'd like to know more about membership.",
      },
    ],
  },
  {
    id: 'visitor-mtm',
    name: 'Live Stream — Millions to Meditate',
    surface: 'visitor',
    surfaceLabel: 'Visitor Screen',
    description:
      'The daily live broadcast card for daily meditation and morning yoga sessions.',
    badge: 'Daily Engagement',
    iconName: 'stream',
    fields: [
      {
        key: 'visitor.mtm.live',
        label: 'Live Broadcast Status Text',
        description: 'Subtitle displayed while a live stream is actively broadcasting.',
        defaultValue: 'Happening now — free to join',
        type: 'short-text',
        placeholder: 'Happening now — free to join',
      },
      {
        key: 'visitor.mtm.free',
        label: 'Scheduled Free Badge Text',
        description: 'Subtext indicating the upcoming broadcast is free without a paid membership.',
        defaultValue: 'Free, no plan needed',
        type: 'short-text',
        placeholder: 'Free, no plan needed',
      },
    ],
  },
  {
    id: 'visitor-events',
    name: 'Upcoming Events Rail',
    surface: 'visitor',
    surfaceLabel: 'Visitor Screen',
    description:
      'Carousel showcasing one-off workshops, challenges, and special club events.',
    badge: 'Carousel',
    iconName: 'calendar',
    fields: [
      {
        key: 'visitor.events.title',
        label: 'Section Title',
        description: 'Heading displayed above the events carousel.',
        defaultValue: 'Events at Fitflix',
        type: 'short-text',
        placeholder: 'Events at Fitflix',
      },
      {
        key: 'visitor.events.subtitle',
        label: 'Section Subtitle',
        description: 'Descriptive subtitle below the section title.',
        defaultValue: 'Workshops, challenges and one-off sessions',
        type: 'short-text',
        placeholder: 'Workshops, challenges and one-off sessions',
      },
      {
        key: 'visitor.events.more',
        label: '"See All" Link Label',
        description: 'Action link button navigating to the full events catalog.',
        defaultValue: 'See all',
        type: 'button-label',
        placeholder: 'See all',
      },
    ],
  },
  {
    id: 'visitor-classes',
    name: 'Group Classes Rail',
    surface: 'visitor',
    surfaceLabel: 'Visitor Screen',
    description:
      'Weekly timetable carousel featuring strength, yoga, dance, and conditioning classes.',
    badge: 'Carousel',
    iconName: 'barbell',
    fields: [
      {
        key: 'visitor.classes.title',
        label: 'Section Title',
        description: 'Heading displayed above the group classes timetable.',
        defaultValue: 'Group classes',
        type: 'short-text',
        placeholder: 'Group classes',
      },
      {
        key: 'visitor.classes.subtitle',
        label: 'Section Subtitle',
        description: 'Descriptive subtitle below the section title.',
        defaultValue: 'Strength, mobility and conditioning, every week',
        type: 'short-text',
        placeholder: 'Strength, mobility and conditioning, every week',
      },
      {
        key: 'visitor.classes.more',
        label: '"See All" Link Label',
        description: 'Action link button navigating to the full classes schedule.',
        defaultValue: 'See all',
        type: 'button-label',
        placeholder: 'See all',
      },
    ],
  },
  {
    id: 'visitor-plans',
    name: 'Plans & Pricing Card',
    surface: 'visitor',
    surfaceLabel: 'Visitor Screen',
    description:
      'Condensed membership tier preview block with price points and compare button.',
    badge: 'Conversion',
    iconName: 'pricing',
    fields: [
      {
        key: 'visitor.plans.title',
        label: 'Section Title',
        description: 'Heading for the condensed plans block.',
        defaultValue: 'Plans',
        type: 'short-text',
        placeholder: 'Plans',
      },
      {
        key: 'visitor.plans.subtitle',
        label: 'Section Subtitle',
        description: 'Explains what holding a membership plan unlocks across the club.',
        defaultValue: 'Unlocks booking across recovery, classes and coaching.',
        type: 'short-text',
        placeholder: 'Unlocks booking across recovery, classes and coaching.',
      },
      {
        key: 'visitor.plans.cta',
        label: 'Compare Plans Button Label',
        description: 'Primary button label shown when plan offerings are loaded.',
        defaultValue: 'Compare all plans',
        type: 'button-label',
        placeholder: 'Compare all plans',
      },
      {
        key: 'visitor.plans.cta.empty',
        label: 'Fallback Button Label',
        description: 'Button label used when plan catalog is loading or empty.',
        defaultValue: 'See plans',
        type: 'button-label',
        placeholder: 'See plans',
      },
    ],
  },
  {
    id: 'visitor-closing',
    name: 'Closing Visit & Consult Card',
    surface: 'visitor',
    surfaceLabel: 'Visitor Screen',
    description:
      'Bottom closing section inviting the visitor to book an in-person club tour or consult.',
    badge: 'Conversion',
    iconName: 'chat',
    fields: [
      {
        key: 'visitor.closing.title',
        label: 'Closing Headline',
        description: 'Main invitation title at the bottom of the screen.',
        defaultValue: 'Come see the club',
        type: 'short-text',
        placeholder: 'Come see the club',
      },
      {
        key: 'visitor.closing.body',
        label: 'Closing Pitch Body',
        description: 'Supporting copy outlining questions answered during a club visit.',
        defaultValue:
          'Book a visit or ask us anything — recovery, coaching, DNA programmes and what a plan actually includes.',
        type: 'long-text',
        placeholder: 'Book a visit or ask us anything...',
      },
      {
        key: 'visitor.closing.cta',
        label: 'Primary Button Label',
        description: 'Primary action button to select a membership plan (/plan-renewal).',
        defaultValue: 'Choose a plan',
        type: 'button-label',
        placeholder: 'Choose a plan',
      },
      {
        key: 'visitor.closing.cta.secondary',
        label: 'Secondary Button Label',
        description: 'Secondary action button to schedule a club tour via WhatsApp.',
        defaultValue: 'Book a visit',
        type: 'button-label',
        placeholder: 'Book a visit',
      },
      {
        key: 'visitor.closing.consult.message',
        label: 'WhatsApp Tour Request Message',
        description: 'Pre-filled text sent when tapping "Book a visit".',
        defaultValue: "Hi Fitflix — I'd like to book a club visit.",
        type: 'message',
        placeholder: "Hi Fitflix — I'd like to book a club visit.",
      },
    ],
  },
]

export const ALL_KNOWN_FIELDS: ContentFieldDefinition[] = APP_COMPONENTS.flatMap(
  (c) => c.fields
)

export function findComponentByFieldKey(
  key: string
): ContentComponentDefinition | undefined {
  return APP_COMPONENTS.find((c) => c.fields.some((f) => f.key === key))
}

export function findFieldByKey(key: string): ContentFieldDefinition | undefined {
  return ALL_KNOWN_FIELDS.find((f) => f.key === key)
}
