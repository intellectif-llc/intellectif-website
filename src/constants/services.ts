export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  details: string;
  fullDescription?: string;
  features?: string[];
}

export const SERVICES: ServiceItem[] = [
  {
    id: "web-development",
    title: "Web Development",
    description:
      "Modern, responsive websites built with the latest technologies",
    icon: "/web-development.png",
    details:
      "We create stunning, responsive websites that drive results. Our web development services include custom website design, e-commerce solutions, content management systems, and web applications. We use modern technologies like React, Next.js, and Node.js to build fast, scalable, and SEO-optimized websites that engage your audience and grow your business.",
    fullDescription:
      "We create stunning, responsive websites that drive results. Our web development services include custom website design, e-commerce solutions, content management systems, and web applications. We use modern technologies like React, Next.js, and Node.js to build fast, scalable, and SEO-optimized websites that engage your audience and grow your business.",
    features: [
      "Custom responsive design",
      "Modern JavaScript frameworks",
      "SEO optimization",
      "Performance optimization",
      "Cross-browser compatibility",
      "Mobile-first approach",
    ],
  },
  {
    id: "backend-development",
    title: "Backend Development",
    description: "Robust server-side solutions and APIs for your applications",
    icon: "/backend-dev.png",
    details:
      "Our backend development services provide the foundation for your digital applications. We build secure, scalable APIs, database architectures, server configurations, and cloud integrations. Whether you need a simple REST API or a complex microservices architecture, we ensure your backend is reliable, performant, and secure.",
    fullDescription:
      "Our backend development services provide the foundation for your digital applications. We build secure, scalable APIs, database architectures, server configurations, and cloud integrations. Whether you need a simple REST API or a complex microservices architecture, we ensure your backend is reliable, performant, and secure.",
    features: [
      "RESTful API development",
      "Database design and optimization",
      "Microservices architecture",
      "Security implementation",
      "Performance monitoring",
      "Cloud integration",
    ],
  },
  {
    id: "aws-cloud",
    title: "AWS Cloud Services",
    description: "Scalable cloud infrastructure and deployment solutions",
    icon: "/AWS-cloud.png",
    details:
      "Leverage the power of Amazon Web Services with our cloud expertise. We help you migrate to the cloud, optimize costs, implement DevOps practices, and build cloud-native applications. Our AWS services include EC2, S3, Lambda, RDS, DynamoDB, and more. We ensure your infrastructure is secure, scalable, and cost-effective.",
    fullDescription:
      "Leverage the power of Amazon Web Services with our cloud expertise. We help you migrate to the cloud, optimize costs, implement DevOps practices, and build cloud-native applications. Our AWS services include EC2, S3, Lambda, RDS, DynamoDB, and more. We ensure your infrastructure is secure, scalable, and cost-effective.",
    features: [
      "Cloud migration strategy",
      "Cost optimization",
      "Auto-scaling solutions",
      "Security best practices",
      "DevOps implementation",
      "24/7 monitoring",
    ],
  },
  {
    id: "moodle",
    title: "Moodle Solutions",
    description: "Complete Moodle learning management system expertise",
    icon: "/moodle.png",
    details:
      "Transform your educational or training programs with our comprehensive Moodle expertise. We specialize in creating custom learning environments that engage learners and streamline administration. From initial setup to ongoing management, we handle every aspect of your Moodle platform to ensure it meets your organization's unique needs.",
    fullDescription:
      "Transform your educational or training programs with our comprehensive Moodle expertise. We specialize in creating custom learning environments that engage learners and streamline administration. From initial setup to ongoing management, we handle every aspect of your Moodle platform to ensure it meets your organization's unique needs.",
    features: [
      "Custom plugin development",
      "Server deployment & setup",
      "Platform management & maintenance",
      "Web services integration",
      "Theme customization",
      "Performance optimization",
    ],
  },
  {
    id: "mobile-development",
    title: "Mobile App Development",
    description: "Native and cross-platform mobile applications",
    icon: "/mobile-development.png",
    details:
      "Build engaging mobile applications that connect with your users on-the-go. We develop both native iOS and Android apps, as well as cross-platform solutions using React Native and Flutter. Our mobile apps are designed for performance, user experience, and seamless integration with your existing systems.",
    fullDescription:
      "Build engaging mobile applications that connect with your users on-the-go. We develop both native iOS and Android apps, as well as cross-platform solutions using React Native and Flutter. Our mobile apps are designed for performance, user experience, and seamless integration with your existing systems.",
    features: [
      "Native iOS and Android development",
      "Cross-platform solutions",
      "UI/UX design",
      "App Store optimization",
      "Push notifications",
      "Offline functionality",
    ],
  },
  {
    id: "ai-business",
    title: "AI for your business",
    description: "Intelligent automation and AI-powered solutions",
    icon: "/ai.png",
    details:
      "Transform your business with artificial intelligence and machine learning solutions. We help you implement chatbots, automate repetitive tasks, analyze data for insights, and integrate AI into your existing workflows. Our AI solutions are designed to improve efficiency, reduce costs, and provide competitive advantages for your business.",
    fullDescription:
      "Transform your business with artificial intelligence and machine learning solutions. We help you implement chatbots, automate repetitive tasks, analyze data for insights, and integrate AI into your existing workflows. Our AI solutions are designed to improve efficiency, reduce costs, and provide competitive advantages for your business.",
    features: [
      "Intelligent chatbots",
      "Process automation",
      "Data analysis and insights",
      "Machine learning models",
      "Natural language processing",
      "Predictive analytics",
    ],
  },
];

export const TECH_STACK = [
  { name: "AWS", icon: "/tech-stack/aws.png" },
  { name: "React", icon: "/tech-stack/react.png" },
  { name: "Node.js", icon: "/tech-stack/node.png" },
  { name: "DynamoDB", icon: "/tech-stack/dynamo.png" },
  { name: "Meta", icon: "/tech-stack/meta.png" },
  { name: "MySQL", icon: "/tech-stack/mysql.png" },
  { name: "Python", icon: "/tech-stack/python.png" },
  { name: "MongoDB", icon: "/tech-stack/mongodb.png" },
  { name: "Flutter", icon: "/tech-stack/flutter.png" },
  { name: "Tailwind CSS", icon: "/tech-stack/tailwind.png" },
  { name: "Next.js", icon: "/tech-stack/nextjs.png" },
  { name: "TypeScript", icon: "/tech-stack/typescript.png" },
  { name: "Docker", icon: "/tech-stack/docker.png" },
  { name: "WordPress", icon: "/tech-stack/wordpress.png" },
  { name: "Deno", icon: "/tech-stack/deno.png" },
  { name: "PostgreSQL", icon: "/tech-stack/postgresql.png" },
];

export const PROCESS_STEPS = [
  {
    id: 1,
    title: "Book a Consultation",
    description:
      "Reach out to us and schedule a free consultation. You'll discover how we can help you bring your ideas to life.",
    icon: "calendar",
  },
  {
    id: 2,
    title: "Plan & Strategy",
    description:
      "We analyze your requirements and create a detailed project plan with timelines, milestones, and deliverables.",
    icon: "checklist",
  },
  {
    id: 3,
    title: "Development",
    description:
      "Our expert team brings your vision to life using the latest technologies and best practices.",
    icon: "code",
  },
  {
    id: 4,
    title: "Launch & Support",
    description:
      "We deploy your solution and provide ongoing support to ensure everything runs smoothly.",
    icon: "lightbulb",
  },
];

export const NAVIGATION_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Book a Meeting", href: "/booking" },
];

export const AUTH_NAVIGATION_ITEMS = [
  { label: "Sign In", href: "/auth/signin" },
  { label: "Sign Up", href: "/auth/signup" },
  { label: "Dashboard", href: "/dashboard" },
];
