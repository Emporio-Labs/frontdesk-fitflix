const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const directoriesToScan = ['app', 'components', 'hooks', 'lib', 'stores'];
const specificFiles = ['middleware.ts'];
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

// Patterns to look for
const searchPatterns = [
  {
    name: 'Token/Credentials Clearing',
    regex: /(clearToken|clearCredentials|removeItem\(\s*['"`]hh_|localStorage\.clear)/g,
    color: colors.red
  },
  {
    name: 'Token/Credentials Setting',
    regex: /(storeToken|storeCredentials|setItem\(\s*['"`]hh_)/g,
    color: colors.green
  },
  {
    name: 'Auth Cookie Operations',
    regex: /(hh_authed|document\.cookie\s*=)/g,
    color: colors.yellow
  },
  {
    name: 'Auto-Logout or Redirects to Login',
    regex: /(auto-logout|location\.href\s*=\s*['"`]\/login|redirect\(['"`]\/login)/g,
    color: colors.cyan
  }
];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const fileMatches = [];

    lines.forEach((line, idx) => {
      searchPatterns.forEach(pattern => {
        // Reset lastIndex for regex safety
        pattern.regex.lastIndex = 0;
        let match;
        while ((match = pattern.regex.exec(line)) !== null) {
          fileMatches.push({
            lineNumber: idx + 1,
            matchedText: match[0],
            lineContent: line.trim(),
            patternName: pattern.name,
            color: pattern.color
          });
        }
      });
    });

    return fileMatches;
  } catch (err) {
    console.error(`${colors.red}Error reading file ${filePath}: ${err.message}${colors.reset}`);
    return [];
  }
}

function traverseDirectory(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Exclude common build/dep directories
        if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
          traverseDirectory(fullPath, fileList);
        }
      } else {
        const ext = path.extname(file);
        if (extensions.includes(ext)) {
          fileList.push(fullPath);
        }
      }
    });
  } catch (err) {
    // Directory might not exist in some setups
  }
  return fileList;
}

function runScanner() {
  console.log(`\n${colors.bright}${colors.blue}===================================================`);
  console.log(`          FITFLIX AUTH ACTIONS CODE SCANNER         `);
  console.log(`===================================================${colors.reset}\n`);
  
  let allFiles = [];

  // Gather all files from directories
  directoriesToScan.forEach(dir => {
    const fullDirPath = path.join(__dirname, dir);
    if (fs.existsSync(fullDirPath)) {
      traverseDirectory(fullDirPath, allFiles);
    }
  });

  // Gather specific root files
  specificFiles.forEach(file => {
    const fullFilePath = path.join(__dirname, file);
    if (fs.existsSync(fullFilePath)) {
      allFiles.push(fullFilePath);
    }
  });

  console.log(`${colors.gray}Scanning ${allFiles.length} source files for auth-related operations...${colors.reset}\n`);

  let totalMatches = 0;
  const matchesByFile = {};

  allFiles.forEach(file => {
    const relativePath = path.relative(__dirname, file);
    const matches = scanFile(file);
    if (matches.length > 0) {
      matchesByFile[relativePath] = matches;
      totalMatches += matches.length;
    }
  });

  if (totalMatches === 0) {
    console.log(`${colors.green}✔ No potential issues or token clearing actions found.${colors.reset}\n`);
    return;
  }

  // Print results grouped by file
  Object.keys(matchesByFile).forEach(file => {
    console.log(`${colors.bright}${colors.blue}📄 ${file}${colors.reset}`);
    
    matchesByFile[file].forEach(match => {
      console.log(`  ${colors.gray}Line ${match.lineNumber}:${colors.reset} [${match.color}${match.patternName}${colors.reset}]`);
      console.log(`    ${colors.bright}${match.lineContent}${colors.reset}\n`);
    });
  });

  console.log(`${colors.bright}${colors.blue}===================================================`);
  console.log(`Scan Complete: Found ${totalMatches} auth operations in ${Object.keys(matchesByFile).length} files.`);
  console.log(`===================================================${colors.reset}\n`);
}

runScanner();
