import os
import sys

# Set encoding to utf-8 for output to handle tree characters
sys.stdout.reconfigure(encoding='utf-8')

start = r'c:\Users\prasa\Desktop\RAC\zip_2'
ignore = {'.git', 'node_modules', '__pycache__', 'dist', 'build', '.vscode', '.idea', 'coverage', '.DS_Store'}

def print_tree(dir_path, prefix=''):
    try:
        files = sorted(os.listdir(dir_path))
        files = [f for f in files if f not in ignore]
        for i, f in enumerate(files):
            is_last = i == len(files) - 1
            path = os.path.join(dir_path, f)
            print(prefix + ('└── ' if is_last else '├── ') + f)
            if os.path.isdir(path):
                print_tree(path, prefix + ('    ' if is_last else '│   '))
    except PermissionError:
        pass

print("Generating PROJECT_STRUCTURE.md...")
with open('PROJECT_STRUCTURE.md', 'w', encoding='utf-8') as f:
    f.write("# Project Structure\n\n```\n")
    f.write(".\n")
    
    def write_tree(dir_path, prefix=''):
        try:
            files = sorted(os.listdir(dir_path))
            files = [f for f in files if f not in ignore]
            for i, f in enumerate(files):
                is_last = i == len(files) - 1
                path = os.path.join(dir_path, f)
                line = prefix + ('└── ' if is_last else '├── ') + f
                f_out.write(line + "\n")
                if os.path.isdir(path):
                    write_tree(path, prefix + ('    ' if is_last else '│   '))
        except PermissionError:
            pass

    
    def print_tree_to_file(dir_path, file_obj, prefix=''):
        try:
            files = sorted(os.listdir(dir_path))
            files = [f for f in files if f not in ignore]
            for i, f in enumerate(files):
                is_last = i == len(files) - 1
                path = os.path.join(dir_path, f)
                line = prefix + ('└── ' if is_last else '├── ') + f
                file_obj.write(line + "\n")
                if os.path.isdir(path):
                    print_tree_to_file(path, file_obj, prefix + ('    ' if is_last else '│   '))
        except PermissionError:
            pass

    print_tree_to_file(start, f)
    f.write("```\n")

print("Done.")
