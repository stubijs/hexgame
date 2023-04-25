<script setup lang="ts">
import { LazyHexgame } from '~/.nuxt/components/hexgame';

const route=useRoute()

const query = gql`
query getHexgame($pageId: String!) {
  Hexgame(limit: 1, filter: {project: {_eq: $pageId}, status: {_eq: "published"}}){
    project marker(filter: {status: {_eq: "published"}}){
      title
      content
    }
  }
}
`

const variables = { pageId: route.params.id}

const { data } = await useAsyncQuery(query, variables)

const gameData = data._rawValue.Hexgame[0].marker
</script>

<template>
  <LazyHexGame :hexData=gameData />
</template>
