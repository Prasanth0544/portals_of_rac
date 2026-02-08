import os
import sys

# Set encoding to utf-8 for output to handle tree characters
sys.stdout.reconfigure(encoding='utf-8')

start = r'c:\Users\prasa\Desktop\RAC\zip_2'
ignore = {'.git', 'node_modules', '__pycache__', 'Learnings', '.github', 'dist', 'Architecture_Diagrams', 'build', '.vscode', '.idea', 'coverage', '.DS_Store'}

# Ignore file extensions
ignore_extensions = {'.md', '.pptx', '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.pyc'}

def should_ignore(name):
    """Check if a file/folder should be ignored"""
    if name in ignore:
        return True
    # Always include .env files (they're important for project structure)
    if name.startswith('.env'):
        return False
    # Check file extension
    _, ext = os.path.splitext(name)
    if ext.lower() in ignore_extensions:
        return True
    return False

def print_tree_to_file(dir_path, file_obj, prefix=''):
    """Write directory tree to file"""
    try:
        files = sorted(os.listdir(dir_path))
        files = [f for f in files if not should_ignore(f)]
        for i, f in enumerate(files):
            is_last = i == len(files) - 1
            path = os.path.join(dir_path, f)
            line = prefix + ('└── ' if is_last else '├── ') + f
            file_obj.write(line + "\n")
            if os.path.isdir(path):
                print_tree_to_file(path, file_obj, prefix + ('    ' if is_last else '│   '))
    except PermissionError:
        pass

print("Generating PROJECT_STRUCTURE.md...")
with open('PROJECT_STRUCTURE.md', 'w', encoding='utf-8') as f:
    f.write("# Project Structure\n\n```\n")
    f.write(".\n")
    print_tree_to_file(start, f)
    f.write("```\n")

print("Done.")
