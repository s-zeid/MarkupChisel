build: node_modules
	npm run build

node_modules: package.json
	npm install && touch $@

clean:
	rm -rf dist gen node_modules package-lock.json
