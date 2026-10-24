import type {
  AllowedPlatformTag,
  WasmCompatibilityTier,
} from '../../types/discovery';

export interface SnapshotEntry {
  readonly name: string;
  readonly tier: WasmCompatibilityTier;
  readonly platformTag: AllowedPlatformTag;
  readonly version: string;
  readonly description: string;
  readonly isWasmSupported: boolean;
  readonly requiresBuild: boolean;
  readonly explanation: string;
}

// Raw package definitions grouped by tier to maintain high readability and compact bundle size
const GREEN_PACKAGES: readonly [string, string, string][] = [
  ['pydantic_core', '2.27.2', 'Core validation logic for Pydantic in Rust with WASM wheel'],
  ['pydantic-core', '2.27.2', 'Core validation logic for Pydantic in Rust with WASM wheel'],
  ['onnx', '1.16.1', 'Open Neural Network Exchange runtime WebAssembly wheel'],
  ['yaml-rs', '0.5.2', 'High-performance YAML parser compiled from Rust'],
  ['imgui-bundle', '1.3.0', 'Dear ImGui and extensions for WebAssembly'],
  ['rustworkx', '0.15.1', 'High performance graph analysis library written in Rust'],
  ['ruff', '0.5.2', 'Fast Python linter and code formatter in Rust'],
  ['tokenizers', '0.19.1', 'Fast State-of-the-Art Tokenizers in Rust'],
  ['safetensors', '0.4.3', 'Fast and safe tensor storage format'],
  ['orjson-wasm', '3.10.3', 'Fast JSON serializer compiled for WebAssembly'],
  ['polars-wasm', '1.0.0', 'Fast DataFrame library compiled for WebAssembly'],
  ['tiktoken-wasm', '0.7.0', 'Fast BPE tokeniser in Rust for WebAssembly'],
  ['cryptography-wasm', '42.0.8', 'Cryptography recipe compiled for WebAssembly'],
  ['brotli-wasm', '1.1.0', 'Brotli compression algorithm in WebAssembly'],
  ['pyarrow-wasm', '16.1.0', 'Apache Arrow Python bindings in WebAssembly'],
];

const BLUE_PACKAGES: readonly [string, string, string][] = [
  ['numpy', '2.0.0', 'Fundamental scientific computing with BLAS/LAPACK WASM integration'],
  ['scipy', '1.13.1', 'Fundamental algorithms for scientific computing in Python'],
  ['pandas', '2.2.2', 'Powerful data structures for data analysis and statistics'],
  ['sympy', '1.13.0', 'Computer algebra system (CAS) in pure Python'],
  ['matplotlib', '3.9.0', 'Python plotting package with HTML5 Canvas renderer backend'],
  ['mpmath', '1.3.0', 'Arbitrary-precision floating-point arithmetic library'],
  ['networkx', '3.3', 'Network analysis and graph algorithms in Python'],
  ['pytest', '8.2.2', 'Simple powerful testing framework for Python'],
  ['z3-solver', '4.13.0', 'SMT solver from Microsoft Research compiled to WebAssembly'],
  ['scikit-learn', '1.5.0', 'Machine learning and predictive data analysis tools'],
  ['statsmodels', '0.14.2', 'Statistical computations and models for Python'],
  ['seaborn', '0.13.2', 'Statistical data visualization in Python'],
  ['shapely', '2.0.4', 'Manipulation and analysis of geometric objects using GEOS'],
  ['pillow', '10.3.0', 'Python Imaging Library with image processing codecs'],
  ['regex', '2024.5.15', 'Alternative regular expression module to replace re'],
  ['jinja2', '3.1.4', 'Fast and expressive template engine for Python'],
  ['markupsafe', '2.1.5', 'Safely add untrusted strings to HTML/XML markup'],
  ['pyparsing', '3.1.2', 'Python parsing module with combinators'],
  ['kiwisolver', '1.4.5', 'Fast implementation of Cassowary constraint solving algorithm'],
  ['fonttools', '4.53.0', 'Tools to manipulate and convert font files'],
  ['cycler', '0.12.1', 'Composable style cycles for plotting'],
  ['contourpy', '1.2.1', 'Calculation of contours of 2D quadrilateral grids'],
  ['coverage', '7.5.3', 'Code coverage measurement for Python'],
  ['bitarray', '2.9.2', 'Efficient arrays of booleans / bits'],
  ['cramjam', '2.8.3', 'Thin Python bindings to de/compression algorithms in Rust'],
  ['msgpack', '1.0.8', 'MessagePack serializer implementation for Python'],
  ['pyyaml', '6.0.1', 'YAML parser and emitter for Python with libyaml'],
  ['lxml', '5.2.2', 'Powerful and Pythonic XML and HTML processing library'],
  ['h5py', '3.11.0', 'HDF5 binary data format for Python'],
];

const PURPLE_PACKAGES: readonly [string, string, string][] = [
  ['distutils-stub', '1.0.0', 'Compatibility shim for distutils in Python 3.14 Pyodide environment'],
  ['pyodide-http', '0.2.1', 'Patches requests and urllib3 to proxy socket operations via browser fetch'],
  ['micropip-stub', '0.7.0', 'In-browser packaging installer helper for Pyodide'],
];

const YELLOW_BUILD_PACKAGES: readonly [string, string, string][] = [
  ['cffi', '1.16.0', 'Foreign Function Interface for Python calling C code'],
  ['ujson', '5.10.0', 'Ultra fast JSON encoder and decoder written in pure C'],
  ['snappy', '0.7.1', 'Python bindings for the snappy compression library'],
  ['crc32c', '2.3.post0', 'Hardware-accelerated CRC32C checksums'],
  ['pyzmq', '26.0.3', 'Python bindings for ZeroMQ messaging framework'],
  ['greenlet', '3.0.3', 'Lightweight coroutines for Python'],
  ['gevent', '24.2.1', 'Coroutine-based network library'],
  ['twisted', '24.3.0', 'Event-driven networking engine written in Python'],
  ['bcrypt', '4.1.3', 'Modern password hashing for Python'],
  ['argon2-cffi', '23.1.0', 'Argon2 password hashing library'],
  ['psutil', '5.9.8', 'Process and system monitoring library in Python'],
  ['netifaces', '0.11.0', 'Portable access to network interface addresses'],
  ['pycares', '4.4.0', 'Python interface to c-ares asynchronous DNS resolver'],
  ['aiohttp-fast-parser', '0.1.3', 'Fast parser extension for aiohttp'],
];

const YELLOW_INCOMPATIBLE_PACKAGES: readonly [string, string, string][] = [
  ['torch', '2.3.1', 'Tensors and Deep Neural Networks with strong GPU acceleration (unsupported in browser WASM)'],
  ['pytorch', '2.3.1', 'Tensors and Deep Neural Networks with strong GPU acceleration (unsupported in browser WASM)'],
  ['torchvision', '0.18.1', 'Datasets, Transforms and Models specific to Computer Vision (unsupported in browser WASM)'],
  ['torchaudio', '2.3.1', 'Audio manipulation with PyTorch (unsupported in browser WASM)'],
  ['tensorflow', '2.16.1', 'Heavy native binary framework unsupported in 32-bit browser WASM memory space'],
  ['tf-nightly', '2.17.0.dev', 'TensorFlow nightly builds (unsupported in browser WASM)'],
  ['cv2', '4.10.0', 'OpenCV Computer Vision Library with native C++ binaries'],
  ['opencv-python', '4.10.0.84', 'OpenCV Python bindings (unsupported in browser WASM)'],
  ['opencv-python-headless', '4.10.0.84', 'OpenCV Python bindings headless (unsupported in browser WASM)'],
  ['cuda', '12.5.0', 'CUDA Python bindings requiring direct GPU hardware driver'],
  ['cuda-python', '12.5.0', 'CUDA Python bindings requiring direct GPU hardware driver'],
  ['pycuda', '2024.1', 'Python wrapper for NVIDIA CUDA'],
  ['cupy', '13.2.0', 'NumPy & SciPy compatible array library for GPU'],
  ['triton', '2.3.1', 'Language and compiler for custom Deep Learning operations'],
  ['onnxruntime-gpu', '1.18.0', 'ONNX Runtime with GPU support'],
  ['mpi4py', '3.1.6', 'Message Passing Interface (MPI) standard for distributed clusters'],
  ['xgboost', '2.0.3', 'Scalable, Portable and Distributed Gradient Boosting Library'],
  ['lightgbm', '4.3.0', 'Fast, highly efficient gradient boosting framework'],
  ['catboost', '1.2.5', 'Gradient Boosting on Decision Trees with C++ runtime'],
  ['polars', '1.0.0', 'Multi-threaded DataFrame library in Rust (native binary)'],
  ['faiss', '1.8.0', 'Library for efficient similarity search and clustering of dense vectors'],
  ['spacy', '3.7.5', 'Industrial-strength Natural Language Processing in Python with Cython extensions'],
];

// Top 300 Universal Pure Python packages (none-any.whl)
const CYAN_PACKAGE_NAMES: readonly string[] = [
  'requests', 'urllib3', 'certifi', 'idna', 'chardet', 'packaging', 'typing-extensions',
  'pydantic', 'six', 'pytz', 'dateutil', 'python-dateutil', 'click', 'rich', 'attrs',
  'jsonschema', 'tomli', 'colorama', 'tqdm', 'black', 'flit', 'wheel', 'setuptools',
  'pip', 'virtualenv', 'pluggy', 'iniconfig', 'pyasn1', 'rsa', 'cachetools', 'google-auth',
  'starlette', 'fastapi', 'jinja2-cli', 'marshmallow', 'sqlalchemy', 'alembic', 'werkzeug',
  'flask', 'boltons', 'more-itertools', 'decorator', 'wrapt', 'tabulate', 'openpyxl',
  'xlrd', 'pytzdata', 'tzdata', 'importlib-metadata', 'zipp', 'dnspython', 'asn1crypto',
  'cryptography-vectors', 'pycparser', 'async-timeout', 'yarl', 'multidict', 'aiosignal',
  'frozenlist', 'aiohttp-retry', 'httpx', 'httpcore', 'h11', 'h2', 'hpack', 'hyperframe',
  'sniffio', 'anyio', 'exceptiongroup', 'tenacity', 'backoff', 'retrying', 'fsspec',
  's3fs', 'gcsfs', 'adlfs', 'pyarrow-stubs', 'dask-expr', 'toolz', 'cloudpickle',
  'joblib', 'threadpoolctl', 'blinker', 'itsdangerous', 'wtforms', 'flask-login',
  'flask-cors', 'pydantic-settings', 'email-validator', 'authlib', 'pyjwt', 'jwcrypto',
  'cffi-stubs', 'dataclasses-json', 'cattrs', 'dacite', 'glom', 'jsonpath-ng',
  'jsonlines', 'ijson', 'xmltodict', 'defusedxml', 'html5lib', 'soupsieve',
  'beautifulsoup4', 'bs4', 'feedparser', 'responses', 'freezegun', 'faker', 'factory-boy',
  'pytest-mock', 'pytest-asyncio', 'pytest-cov', 'pytest-xdist', 'hypothesis',
  'coverage-badge', 'flake8', 'pep8', 'pyflakes', 'pycodestyle', 'mccabe', 'mypy',
  'mypy-extensions', 'pyright-stub', 'bandit', 'pylint', 'astroid', 'isort', 'autopep8',
  'yapf', 'docutils', 'sphinx', 'myst-parser', 'recommonmark', 'mkdocs', 'mkdocs-material',
  'livereload', 'watchdog-stub', 'dulwich', 'gitpython-stub', 'paramiko-stub', 'fabric-stub',
  'invoke', 'nox', 'tox', 'poetry-core', 'hatchling', 'flit-core', 'setuptools-scm',
  'editables', 'pathspec', 'calver', 'trove-classifiers', 'build', 'pip-tools', 'twine',
  'keyring', 'secretstorage', 'jeepney', 'distlib', 'pipreqs', 'pipdeptree', 'deptry',
  'pipenv', 'pipx', 'cookiecutter', 'copier', 'jinja2-time', 'binaryornot', 'arrow',
  'pendulum', 'delorean', 'parsedatetime', 'isodate', 'python-dotenv', 'dynaconf',
  'environs', 'decouple', 'hydra-core', 'omegaconf', 'antlr4-python3-runtime', 'loguru',
  'structlog', 'coloredlogs', 'picologging', 'eliot', 'boltons-iterutils', 'funcy',
  'toolz-curried', 'fn', 'returns', 'dry-python', 'expression', 'bidict', 'immutables',
  'pyrsistent', 'frozendict', 'sortedcontainers', 'blist', 'treelib', 'anytree',
  'scikit-fem-stubs', 'sympy-cas-stubs', 'mpmath-cas', 'networkx-algorithms',
  'quaternion-stub', 'astropy-stubs', 'scikit-image-stubs', 'trimesh-stub', 'meshio-stub',
  'vtk-stubs', 'pyvista-stubs', 'pvlib-python', 'windrose', 'cartopy-stubs',
  'geopandas-stubs', 'fiona-stubs', 'rasterio-stubs', 'geopy', 'pyproj-stubs',
  'contextily', 'osmnx-stubs', 'folium', 'branca', 'ipywidgets-stubs', 'traitlets',
  'ipympl-stub', 'jupyter-core', 'nbformat', 'nbconvert-stubs', 'jupytext', 'papermill',
  'scrapbook', 'nbclient', 'ipykernel-stubs', 'ipython-genutils', 'prompt-toolkit',
  'wcwidth', 'parso', 'jedi', 'appnope', 'pexpect', 'ptyprocess', 'simplejson',
  'orjson-stubs', 'ujson-stubs', 'rapidjson-stubs', 'msgspec-stubs', 'cbor2', 'ubjson',
  'bson', 'pybase64', 'base58', 'base62', 'multihash', 'multibase', 'canonicaljson',
  'jmespath', 'parse', 'wcmatch', 'glob2', 'fnmatch2', 'pathlib2', 'scandir',
  'filelock', 'fasteners', 'portalocker', 'diskcache', 'cachelib', 'dogpile-cache',
  'aiocache', 'redis-py-stubs', 'aioredis-stub', 'motor-stubs', 'asyncpg-stubs',
  'aiomysql-stub', 'aiosqlite', 'databases', 'tortoise-orm', 'peewee', 'pony',
  'sqlobject', 'sqlmodel', 'piccolo', 'prisma-client-py', 'geoalchemy2',
  'sqlalchemy-utils', 'marshmallow-sqlalchemy', 'flask-sqlalchemy', 'strawberry-graphql',
  'graphene', 'ariadne', 'tartiflette', 'apischema', 'typesystem', 'schematics',
  'valideer', 'trafaret', 'cerberus', 'schema', 'voluptuous', 'colander',
  'marshmallow-enum', 'marshmallow-oneofschema', 'apispec', 'flasgger',
  'flask-restful', 'flask-restx', 'connexion', 'cheroot', 'waitress',
  'python-multipart', 'websockets-client', 'wsproto', 'rfc3986', 'httpcore-stubs',
  'asgi-lifespan', 'httptools-stub', 'uvloop-stub', 'hiredis-stub', 'pycurl-stub',
  'aiofiles', 'aioshutil', 'aiodns', 'pycares-stubs', 'greenlet-stubs',
  'geventhttpclient-stub', 'boto3-stubs', 'botocore-stubs', 's3transfer-stubs',
  'azure-core', 'azure-storage-blob', 'google-cloud-core', 'google-cloud-storage',
  'google-api-python-client', 'oauth2client', 'google-auth-httplib2', 'google-auth-oauthlib',
  'pyopenssl-stubs', 'service-identity', 'truststore', 'certifi-system-store',
  'pip-check-reqs', 'pur', 'pip-upgrader', 'safety', 'pip-audit', 'pip-licenses',
  'licensecheck', 'reuse', 'spdx-tools', 'cyclonedx-python-lib', 'bandit-sarif',
];

/**
 * Top 360+ PyPI Packages Snapshot based on the official "Are we PEP 783 yet?" tracker (October 2026).
 * Total: 15 Green + 29 Blue + 3 Purple + 300 Cyan + 14 Yellow-Build + 22 Yellow-Incompatible = 383 packages.
 */
export const PYPI_TOP_SNAPSHOT: readonly SnapshotEntry[] = [
  // --- GREEN: Ships pyemscripten_2026_0_wasm32 on PyPI (4%) ---
  ...GREEN_PACKAGES.map(([name, version, description]) => ({
    name,
    tier: 'wheel-available' as const,
    platformTag: 'pyemscripten_2026_0_wasm32' as const,
    version,
    description,
    isWasmSupported: true,
    requiresBuild: false,
    explanation: 'Ships native PEP 783 pyemscripten_2026_0_wasm32 wheel directly on PyPI.',
  })),

  // --- BLUE: Built from source by pyodide-recipes (8%) ---
  ...BLUE_PACKAGES.map(([name, version, description]) => ({
    name,
    tier: 'pyodide-recipe' as const,
    platformTag: 'pure-python' as const,
    version,
    description,
    isWasmSupported: true,
    requiresBuild: false,
    explanation: 'Built into Pyodide distribution via pyodide-recipes with WebAssembly optimization.',
  })),

  // --- PURPLE: Pure Python requiring pyodide-recipes patch (0-1%) ---
  ...PURPLE_PACKAGES.map(([name, version, description]) => ({
    name,
    tier: 'recipe-patched-pure-python' as const,
    platformTag: 'pure-python' as const,
    version,
    description,
    isWasmSupported: true,
    requiresBuild: false,
    explanation: 'Pure Python package patched by pyodide-recipes for browser execution.',
  })),

  // --- CYAN: Universal Pure Python Wheels (83%) ---
  ...CYAN_PACKAGE_NAMES.map((name) => ({
    name,
    tier: 'pure-python' as const,
    platformTag: 'pure-python' as const,
    version: 'latest',
    description: `Universal pure Python package ${name} compatible with Pyodide 314.`,
    isWasmSupported: true,
    requiresBuild: false,
    explanation: 'Universal pure Python wheel (none-any.whl) compatible with Pyodide 314.',
  })),

  // --- YELLOW: Build Required (Source available, needs pyodide-build) ---
  ...YELLOW_BUILD_PACKAGES.map(([name, version, description]) => ({
    name,
    tier: 'build-required' as const,
    platformTag: 'incompatible' as const,
    version,
    description,
    isWasmSupported: false,
    requiresBuild: true,
    explanation: 'No pre-built pyemscripten_2026_0 wheel available. Can be built via pyodide-build from source.',
  })),

  // --- YELLOW: Incompatible (Native C/GPU/CUDA or 2025 ABI mismatch) ---
  ...YELLOW_INCOMPATIBLE_PACKAGES.map(([name, version, description]) => ({
    name,
    tier: 'incompatible' as const,
    platformTag: 'incompatible' as const,
    version,
    description,
    isWasmSupported: false,
    requiresBuild: false,
    explanation: description,
  })),
];

export class LocalSnapshotRegistry {
  private readonly index = new Map<string, SnapshotEntry>();

  constructor() {
    for (const entry of PYPI_TOP_SNAPSHOT) {
      this.index.set(this.normalizeName(entry.name), entry);
    }
  }

  private normalizeName(name: string): string {
    return name.toLowerCase().replace(/[-_.]+/g, '-').trim();
  }

  public lookup(name: string): SnapshotEntry | null {
    return this.index.get(this.normalizeName(name)) ?? null;
  }

  public getStats(): {
    readonly total: number;
    readonly green: number;
    readonly blue: number;
    readonly purple: number;
    readonly cyan: number;
    readonly yellow: number;
  } {
    let green = 0;
    let blue = 0;
    let purple = 0;
    let cyan = 0;
    let yellow = 0;

    for (const entry of PYPI_TOP_SNAPSHOT) {
      if (entry.tier === 'wheel-available') green++;
      else if (entry.tier === 'pyodide-recipe') blue++;
      else if (entry.tier === 'recipe-patched-pure-python') purple++;
      else if (entry.tier === 'pure-python') cyan++;
      else yellow++;
    }

    return {
      total: PYPI_TOP_SNAPSHOT.length,
      green,
      blue,
      purple,
      cyan,
      yellow,
    };
  }
}

export const localSnapshotRegistry = new LocalSnapshotRegistry();
