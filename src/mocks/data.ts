import type {
  Lab,
  Metric,
  ProductDetail,
  TechSystemDetail,
} from "../api/types";

/* 新闻不在这里写死。一篇新闻 = content/news 下的一个 .md 文件，
   由 ../data/news 在构建期收集好再从这里转出去 —— 这样加新闻不用碰代码。 */
export { news } from "../data/news";

/* 体系与产品的文案口径（用户要求「有底气，别像 AI 写的」）：
   · 只写做了什么、边界在哪，不写「赋能 / 全链路 / 深度集成 / 打造闭环 / 开箱即用」这类词；
   · 能用具体动作说清的，不堆形容词；
   · long_description 允许讲一句「所以意味着什么」，但要能被产品实际能力对上。
   功能事实（双引擎、S3 兼容、PoW、多因素认证等）不许为了好看而改动。 */
export const techSystems: TechSystemDetail[] = [
  {
    slug: "hec",
    name: "HEC",
    full_name: "Hyper Evolution Connect",
    description: "全域互联与统一授权",
    icon: null,
    long_description:
      "HEC 将身份、授权与系统互通沉淀为统一的基础设施，供全部产品复用。第三方系统按标准协议接入，即可获得统一登录与安全控制能力，无需重建账号体系。",
    features: [
      {
        title: "统一登录接入",
        description:
          "按标准协议接入，即可获得统一登录与安全控制，无需重建账号体系。",
      },
      {
        title: "认证结果跨产品复用",
        description: "信任中心签发的认证结果在产品之间直接复用，无需重复校验。",
      },
      {
        title: "跨区域授权链路",
        description:
          "跨区域访问统一走同一条授权链路，连接质量、风控与审计记录均可追溯。",
      },
    ],
    metrics: [
      { label: "标准协议支持", value: "6+", unit: null },
      { label: "授权延迟", value: "<200", unit: "ms" },
      { label: "审计覆盖率", value: "100", unit: "%" },
    ],
  },
  {
    slug: "uef",
    name: "UEF",
    full_name: "Ultra Evolution Framework",
    description: "AI 驱动的全栈执行架构",
    icon: null,
    long_description:
      "UEF 以统一运行时、能力编排、AI 引擎与安全治理，构成从代码到上线的完整链路。IDE 与云平台遵循同一套工程规范，避免重复维护；模型能力经 RAG 落地到教学问答、代码审查、结对编程与错误分析等环节。",
    features: [
      {
        title: "统一发布编排",
        description:
          "交互、服务与治理各层遵循同一套标准接入，发布节奏由编排层统一调度。",
      },
      {
        title: "IDE 原生服务化",
        description:
          "编译、调试、部署与协作均以服务形式提供，IDE 专注呈现层，无需在本地维护多套工具链。",
      },
      {
        title: "模型能力落地",
        description:
          "教学问答、代码审查、结对编程与错误分析均由大模型与 RAG 支撑，回答依据来自项目自身的代码与文档。",
      },
      {
        title: "安全内建",
        description:
          "安全策略作为默认项启用，配置错误与灰度发布风险在流程内拦截。",
      },
    ],
    metrics: [
      { label: "核心服务模块", value: "40+", unit: null },
      { label: "AI 功能模块", value: "6+", unit: null },
      { label: "默认启用安全策略", value: "100", unit: "%" },
    ],
  },
  {
    slug: "cep",
    name: "CEP",
    full_name: "Cloud Evolution Platform",
    description: "企业级云能力平台",
    icon: null,
    long_description:
      "CEP 以 MySQL / PostgreSQL 双引擎数据库、S3 兼容对象存储与工作量证明验证服务，构成统一的云服务栈。三者共用一套配额与监控体系，一次接入即可使用，无需分别对接。",
    features: [
      {
        title: "云数据库双引擎",
        description:
          "ECD 同时提供 MySQL 与 PostgreSQL，配额按需调整，扩容无需停机。",
      },
      {
        title: "标准 S3 接口",
        description:
          "EOSS 遵循标准 S3 协议，现有工具链可直接使用；密钥与权限按桶粒度控制。",
      },
      {
        title: "PoW 人机验证",
        description:
          "WeAuth 以工作量证明区分人机，正常用户无需点选图片；接入仅需一个 SDK。",
      },
    ],
    metrics: [
      { label: "服务可用性", value: "99.99", unit: "%" },
      { label: "核心链路延迟", value: "<10", unit: "ms" },
      { label: "加密标准", value: "AES-256", unit: null },
    ],
  },
];

export const products: ProductDetail[] = [
  {
    slug: "ide",
    name: "E时代IDE",
    description: "AI 驱动的云端开发环境",
    category: "core",
    tags: ["IDE", "AI", "Cloud", "RAG"],
    url: "https://ide.emoera.com/",
    featured: true,
    status: "live",
    long_description:
      "通过浏览器即可完成编写、运行与部署，本地无需搭建完整开发环境。AI 教学助手、代码审查、结对编程、逐行解读与错误分析集成于同一编辑器，支持多语言与多人实时协作编辑同一文件。",
    features: [
      {
        title: "AI 教学助手",
        description:
          "基于 RAG 在项目代码与讲义中检索依据，回答以项目实际内容为准，而非通用模板。",
      },
      {
        title: "代码审查",
        description: "提交前执行检查，定位问题并给出修改建议。",
      },
      {
        title: "结对编程",
        description: "多人同时编辑同一文件，修改实时同步。",
      },
      {
        title: "错误分析",
        description: "将报错信息转化为可读说明，定位出错行并解释原因。",
      },
    ],
    metrics: [
      { label: "AI 能力", value: "6+", unit: null },
      { label: "支持语言", value: "10+", unit: null },
    ],
    tech_system: "uef",
  },
  {
    slug: "cloud",
    name: "E时代云服务",
    description: "企业级云服务平台",
    category: "core",
    tags: ["Cloud", "Platform", "Enterprise"],
    url: "https://cloud.emoera.com/",
    featured: true,
    status: "live",
    long_description:
      "数据库、对象存储与人机验证统一于同一控制台，配额、用量与监控集中呈现。应用从开发到上线所需的云资源，无需在多个平台之间分别对接。",
    features: [
      {
        title: "云数据库",
        description: "MySQL 与 PostgreSQL 两种引擎，配额按需调整。",
      },
      {
        title: "对象存储",
        description: "标准 S3 接口，密钥与权限按桶粒度控制。",
      },
      {
        title: "人机验证",
        description: "以工作量证明区分人机，正常用户无需点选图片。",
      },
    ],
    metrics: [
      { label: "可用性", value: "99.99", unit: "%" },
      { label: "延迟", value: "<10", unit: "ms" },
    ],
    tech_system: "cep",
  },
  {
    slug: "weauth",
    name: "WeAuth 微验",
    description: "基于工作量证明的人机验证服务",
    category: "core",
    tags: ["Security", "PoW", "Verification"],
    url: "https://www.weauth.cn/",
    featured: true,
    status: "live",
    long_description:
      "以工作量证明区分人机，正常用户无需任何操作。风险判断在服务端完成，接入仅需一个 SDK。",
    features: [
      {
        title: "PoW 验证",
        description: "以计算量区分人机，正常用户无需任何操作。",
      },
      {
        title: "动态风控",
        description: "依据访问行为实时判定风险，异常流量在服务端拦截。",
      },
      {
        title: "低延迟接入",
        description: "单个 SDK 完成接入，无需额外部署。",
      },
    ],
    metrics: [
      { label: "验证延迟", value: "<200", unit: "ms" },
      { label: "拦截率", value: "99.9", unit: "%" },
    ],
    tech_system: "cep",
  },
  {
    slug: "ecd",
    name: "E时代云数据库",
    description: "MySQL / PostgreSQL 双引擎云数据库",
    category: "core",
    tags: ["Database", "MySQL", "PostgreSQL"],
    url: "https://ecd.cloud.emoera.com/",
    featured: true,
    status: "live",
    long_description:
      "ECD 同时提供 MySQL 与 PostgreSQL 双引擎，配额按需调整，扩容无需停机。自动备份、监控告警与权限管理默认启用。",
    features: [
      {
        title: "双引擎",
        description: "MySQL 与 PostgreSQL 均可启用，无需二选一。",
      },
      { title: "弹性配额", description: "按需扩容，无需停机。" },
      {
        title: "自动备份",
        description: "按策略自动备份，可恢复至任意备份点。",
      },
    ],
    metrics: [
      { label: "可用性", value: "99.99", unit: "%" },
      { label: "延迟", value: "<10", unit: "ms" },
    ],
    tech_system: "cep",
  },
  {
    slug: "eoss",
    name: "E时代云存储",
    description: "S3 兼容的对象存储服务",
    category: "core",
    tags: ["Storage", "S3", "OSS"],
    url: "https://eoss.cloud.emoera.com/",
    featured: true,
    status: "live",
    long_description:
      "EOSS 遵循标准 S3 协议，现有工具链与代码可直接沿用，迁移无需改动业务逻辑。密钥与权限策略按桶粒度控制，图片托管、文件分享与备份共用同一套接口。",
    features: [
      {
        title: "S3 兼容",
        description: "遵循标准 S3 API，现有 SDK 与命令行工具可直接使用。",
      },
      {
        title: "多密钥管理",
        description: "同一桶可配置多把密钥，各自读写范围独立设定。",
      },
      { title: "高可用", description: "多副本存储，单点故障不影响读写。" },
    ],
    metrics: [
      { label: "可用性", value: "99.99", unit: "%" },
      { label: "加密", value: "AES-256", unit: null },
    ],
    tech_system: "cep",
  },
  {
    slug: "trust",
    name: "E时代信任中心",
    description: "可信认证与结果复用",
    category: "core",
    tags: ["Trust", "Security", "Identity"],
    url: "https://trust.emoera.com/",
    featured: false,
    status: "live",
    long_description:
      "认证在此完成一次，结果可在多个业务系统间复用，用户无需在每一入口重复验证身份。",
    features: [
      {
        title: "可信认证",
        description: "支持多因素认证，在密码之外增加一层校验。",
      },
      { title: "结果复用", description: "一次认证，多处可用。" },
    ],
    metrics: [],
    tech_system: "hec",
  },
  {
    slug: "clipboard",
    name: "E时代云剪贴板",
    description: "代码与文件分享，带权限控制",
    category: "ecosystem",
    tags: ["Share", "Clipboard", "Permission"],
    url: "https://code.emoera.cn/",
    featured: false,
    status: "live",
    long_description:
      "支持代码与文件分享，可设置可见范围与有效期限，通过链接对外分发。",
    features: [],
    metrics: [],
    tech_system: null,
  },
  {
    slug: "contest",
    name: "E时代比赛报名系统",
    description: "竞赛报名与流程管理",
    category: "ecosystem",
    tags: ["Contest", "Registration", "Management"],
    url: "https://acm.emoera.cn/",
    featured: false,
    status: "live",
    long_description:
      "覆盖报名、信息收集与名单导出全流程，组织者无需在表格之间搬运数据。",
    features: [],
    metrics: [],
    tech_system: null,
  },
  {
    slug: "image-host",
    name: "E时代图床",
    description: "图片托管服务",
    category: "ecosystem",
    tags: ["ImageHosting", "Upload"],
    url: "https://image.emoera.cn/",
    featured: false,
    status: "live",
    long_description: "上传即生成外链，可直接用于文档、博客与代码。",
    features: [],
    metrics: [],
    tech_system: null,
  },
  {
    slug: "forum",
    name: "E时代论坛",
    description: "技术交流社区",
    category: "ecosystem",
    tags: ["Forum", "Community", "Knowledge"],
    url: "https://ideawit.com/",
    featured: false,
    status: "live",
    long_description: "沉淀团队技术讨论与问题记录，便于检索复用。",
    features: [],
    metrics: [],
    tech_system: null,
  },
  {
    slug: "git",
    name: "E时代Git",
    description: "代码托管与协作",
    category: "ecosystem",
    tags: ["Git", "Code", "Collaboration"],
    url: "https://git.emoera.com/explore/repos",
    featured: false,
    status: "live",
    long_description:
      "提供仓库、分支与合并请求管理，提交到上线的记录全程可追溯。",
    features: [],
    metrics: [],
    tech_system: null,
  },
];

export const labs: Lab[] = [
  {
    slug: "miaoji",
    name: "妙计实验室",
    description: "前沿技术开发与算法研究",
    focus: "专注于前沿技术开发与算法研究，旗下包括启发实验室与 E时代科技。",
    url: "https://home.miaojilab.cn/",
  },
  {
    slug: "qifa",
    name: "启发实验室",
    description: "E时代协会的算法与开发中心",
    focus: "E时代协会的算法与开发中心，IDE 于此研发。",
    url: "https://www.qifalab.cn/qifalab-v1/",
  },
];

export const teamMetrics: Metric[] = [
  { label: "标准协议支持", value: "6+", unit: null },
  { label: "授权延迟", value: "<200", unit: "ms" },
  { label: "审计覆盖率", value: "100", unit: "%" },
  { label: "核心服务模块", value: "40+", unit: null },
  { label: "AI 功能模块", value: "6+", unit: null },
  { label: "服务可用性", value: "99.99", unit: "%" },
  { label: "核心链路延迟", value: "<10", unit: "ms" },
  { label: "加密标准", value: "AES-256", unit: null },
];
